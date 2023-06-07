# frozen_string_literal: true

require 'roo'

module Import
  class ImportSamples
    attr_reader :xlsx, :sheet, :header, :mandatory_check, :rows, :unprocessable,
                :processed, :file_path, :collection_id, :current_user_id

    include ImportSamplesMethods

    def initialize(file_path, collection_id, user_id)
      @rows = []
      @unprocessable = []
      @processed = []
      @file_path = file_path
      @collection_id = collection_id
      @current_user_id = user_id
    end

    def read_file
      @xlsx = Roo::Spreadsheet.open(file_path)
    end

    def check_required_fields
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1)
      @mandatory_check = {}
      ['molfile', 'smiles', 'cano_smiles', 'canonical smiles'].each do |check|
        @mandatory_check[check] = true if header.find { |e| /^\s*#{check}?/i =~ e }
      end

      message = 'Column headers should have: molfile, or Smiles (or cano_smiles, canonical smiles)'
      raise message if mandatory_check.empty?
    end

    def molfile?(row)
      mandatory_check['molfile'] && row['molfile'].to_s.present?
    end

    def smiles?(row)
      header = mandatory_check['smiles'] || mandatory_check['cano_smiles'] || mandatory_check['canonical smiles']
      cell = row['smiles'].to_s.present? || row['cano_smiles'].to_s.present? || row['canonical smiles'].to_s.present?
      header && cell
    end

    def structure?(row)
      molfile?(row) || smiles?(row)
    end

    def process_row(data)
      row = [header, xlsx.row(data)].transpose.to_h

      return unless structure?(row) || row['decoupled'] == 'Yes'

      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    def process_all_rows
      (2..xlsx.last_row).each do |data|
        process_row(data)
      end
      begin
        write_to_db
        if processed.empty?
          no_success
        else
          @unprocessable.empty? ? success : warning
        end
      rescue StandardError => e
        warning(e.message)
      end
    end

    # def process_batch
    #   batch_size = 100
    #   result = nil
    #   (2..xlsx.last_row).each_slice(batch_size) do |batch|
    #     batch.each do |row_data|
    #       process_row(row_data)
    #       write_to_db
    #       rows.clear
    #     rescue StandardError => e
    #       Rails.logger.debug { "Error processing row: #{row_data}. Error: #{e.message}" }
    #       @unprocessable << { row: row_data }
    #     end
    #     result = if processed.empty?
    #                no_success
    #              else
    #                @unprocessable.empty? ? success : warning
    #              end
    #   end
    #   result
    # end

    def excluded_fields
      [
        'id',
        # 'name',
        # 'target_amount_value',
        # 'target_amount_unit',
        'created_at',
        'updated_at',
        # 'description',
        'molecule_id',
        'molfile',
        # 'purity',
        # 'solvent',
        'impurities',
        # 'location',
        'is_top_secret',
        'ancestry',
        # 'external_label',
        'created_by',
        'short_label',
        # 'real_amount_value',
        # 'real_amount_unit',
        # 'imported_readout',
        'deleted_at',
        'sample_svg_file',
        'user_id',
        'identifier',
        # 'density',
        # 'melting_point',
        # 'boiling_point',
        'fingerprint_id',
        'xref',
        # 'molarity_value',
        # 'molarity_unit',
        'molecule_name_id',
      ]
    end

    def included_fields
      Sample.attribute_names - excluded_fields
    end

    def handle_sample_solvent_columnt(sample, row)
      return unless row['solvent'].is_a? String

      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(row['solvent']) }
      solvent_column = [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }]
      sample['solvent'] = solvent_column if solvent.present?
    end

    def validate_sample_and_save(sample, stereo, row)
      handle_sample_solvent_columnt(sample, row)
      sample.validate_stereo(stereo)
      sample.collections << Collection.find(collection_id)
      sample.collections << Collection.get_all_collection_for_user(current_user_id)
      sample.save!
      processed.push(sample)
    end

    def process_sample_fields(sample, db_column, field, row)
      return unless included_fields.include?(db_column)

      excluded_column = %w[description solvent location external_label].freeze
      comparison_values = %w[melting_point boiling_point].freeze

      value = row[field]
      value = format_to_interval_syntax(value) if comparison_values.include?(db_column)

      sample[db_column] = value || ''
      sample[db_column] = '' if excluded_column.include?(db_column) && row[field].nil?
      sample[db_column] = row[field] == 'Yes' if %w[decoupled].include?(db_column)
    end

    def sample_save(row, molfile, molecule)
      sample = Sample.new(created_by: current_user_id)
      sample.molfile = molfile
      sample.molecule = molecule
      stereo = {}
      header.each do |field|
        stereo[Regexp.last_match(1)] = row[field] if field.to_s.strip =~ /^stereo_(abs|rel)$/
        map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == "\"#{field}\"" }
        db_column = map_column.nil? ? field : map_column[0].sub('s.', '').delete!('"')
        process_sample_fields(sample, db_column, field, row)
      end
      validate_sample_and_save(sample, stereo, row)
    end

    def extract_molfile_and_molecule(row)
      # If molfile and smiles (Canonical smiles) is both present
      #  Double check the rows
      if molfile?(row) && smiles?(row)
        get_data_from_molfile_and_smiles(row)
      elsif molfile?(row)
        get_data_from_molfile(row)
      elsif smiles?(row)
        get_data_from_smiles(row)
      end
    end

    def process_row_data(row)
      return Molecule.find_or_create_dummy if row['decoupled'] == 'Yes' && !structure?(row)

      molfile, molecule = extract_molfile_and_molecule(row)
      return if molfile.nil? || molecule.nil?

      [molfile, molecule]
    end

    def write_to_db
      unprocessable_count = 0
      begin
        ActiveRecord::Base.transaction do
          rows.map.with_index do |row, i|
            molfile, molecule = process_row_data(row)
            if molecule_not_exist(molecule)
              unprocessable_count += 1
              next
            end
            sample_save(row, molfile, molecule)
          rescue StandardError
            unprocessable_count += 1
            @unprocessable << { row: row, index: i }
          end
        end
      rescue StandardError => _e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def process
      begin
        read_file
      rescue StandardError => e
        return error_process_file(e.message)
      end

      begin
        check_required_fields
      rescue StandardError => e
        return error_required_fields(e.message)
      end

      begin
        process_all_rows
      rescue StandardError => e
        error_process(e.message)
      end
    end
  end
end
