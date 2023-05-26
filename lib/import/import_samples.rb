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

    def process_row(data)
      row = [header, xlsx.row(data)].transpose.to_h

      return unless has_structure(row) || row['decoupled'] == 'Yes'

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

    def process_batch
      batch_size = 100
      (2..xlsx.last_row).each_slice(batch_size) do |batch|
        batch.each do |row_data|
          begin
            process_row(row_data)
            write_to_db
            rows.clear
          rescue => e
            puts "Error processing row: #{row_data}. Error: #{e.message}"
            @unprocessable << { row: row_data }
          end
        end
      end
    end

    def write_to_db
      unprocessable_count = 0
      begin
        ActiveRecord::Base.transaction do
          rows.map.with_index do |row, i|
            begin
              if row['decoupled'] == 'Yes' && !has_structure(row)
                molecule = Molecule.find_or_create_dummy
              else
              # If molfile and smiles (Canonical smiles) is both present
              #  Double check the rows
                if has_molfile(row) && has_smiles(row)
                  molfile, go_to_next = get_data_from_molfile_and_smiles(row)
                  next if go_to_next
                end

                if has_molfile(row)
                  molfile, molecule = get_data_from_molfile(row)
                elsif has_smiles(row)
                  molfile, molecule, go_to_next = get_data_from_smiles(row)
                  next if go_to_next
                end
                if molecule_not_exist(molecule)
                  unprocessable_count += 1
                  next
                end
              end
              sample_save(row, molfile, molecule)
            rescue
              unprocessable_count += 1
              @unprocessable << { row: row, index: i }
            end
          end
        end
      rescue => e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def process(delayed_job: false)
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
        delayed_job ? process_batch : process_all_rows
      rescue StandardError => e
        return error_process(e.message)
      end
    end
<<<<<<< HEAD
    return molfile_coord, molecule, go_to_next
  end

  def molecule_not_exist(molecule)
    @unprocessable << { row: row, index: i } if molecule.nil?
    molecule.nil?
  end

  # format row[field] for melting and boiling point
  def format_to_interval_syntax(row_field)
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if row_field.nil?

    # Regex checks for a range of numbers that are separated by a dash, or a single number
    matches = row_field.scan(/^(-?\d+(?:[.,]\d+)?)(?:\s*-\s*(-?\d+(?:[.,]\d+)?))?$/).flatten.compact
    return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if matches.empty?

    numbers = matches.filter_map(&:to_f)
    lower_bound, upper_bound = numbers.size == 1 ? [numbers[0], Float::INFINITY] : numbers
    "[#{lower_bound}, #{upper_bound}]"
  end

  def sample_save(row, molfile, molecule)
    sample = Sample.new(created_by: current_user_id)
    sample.molfile = molfile
    sample.molecule = molecule
    # Populate new sample
    stereo = {}
    header.each_with_index do |field, index|
      if field.to_s.strip =~ /^stereo_(abs|rel)$/
        stereo[$1] = row[field]
      end
      map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == '"' + field + '"' }
      db_column = map_column.nil? ? field : map_column[0].sub('s.', '')
      db_column.delete!('"')
      next unless included_fields.include?(db_column)
      comparison_values = %w[melting_point boiling_point]
      sample[db_column] = comparison_values.include?(db_column) ? format_to_interval_syntax(row[field]) : row[field]
      sample[db_column] = '' if %w[description solvent location external_label].include?(db_column) && row[field].nil?
      sample[db_column] = row[field] == 'Yes' if %w[decoupled].include?(db_column)
    end

    if row['solvent'].is_a? String
      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(row['solvent']) }
      sample['solvent'] = [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }] if solvent.present?
    end

    sample['xref']['cas'] = row['cas'] if row['cas'].present?
    sample.validate_stereo(stereo)
    sample.collections << Collection.find(collection_id)
    sample.collections << Collection.get_all_collection_for_user(current_user_id)
    sample.save!
    processed.push(sample)
  end

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

  def error_process_file
    { status: "invalid",
      message: "Can not process this type of file.",
      data: [] }
  end

  def error_required_fields
    { status: "invalid",
      message: "Column headers should have: molfile or Canonical Smiles.",
      data: [] }
  end

  def error_insert_rows
    { status: "invalid",
      message: "Error while parsing the file.",
      data: [] }
  end

  def warning
    { status: "warning",
      message: "No data saved, because following rows cannot be processed: #{unprocessable_rows}.",
      data: unprocessable }
  end

  def unprocessable_rows
    unprocessable.map { |u| u[:index] + 2 }.join(', ')
  end

  def success
    { status: "ok",
      message: "",
      data: processed }
=======
>>>>>>> 75ce1759d (initial implementation of import sample delayed job)
  end
end
