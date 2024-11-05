# frozen_string_literal: true

require 'roo'

# rubocop:disable Metrics/ClassLength
module Import
  class ImportSamples
    attr_reader :xlsx, :sheet, :header, :mandatory_check, :rows, :unprocessable,
                :processed, :file_path, :collection_id, :current_user_id, :file_name

    MOLARITY_UNIT = %r{m/L|mol/L|M}i.freeze
    DENSITY_UNIT = %r{g/mL|g/ml}i.freeze
    FLASH_POINT_UNIT = /°C|F|K/i.freeze

    def initialize(file_path, collection_id, user_id, file_name, import_type)
      @rows = []
      @unprocessable = []
      @processed = []
      @file_path = file_path
      @collection_id = collection_id
      @current_user_id = user_id
      @file_name = file_name
      @import_type = import_type
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

    def read_file
      @xlsx = Roo::Spreadsheet.open(file_path)
    end

    def check_required_fields
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1)
      @mandatory_check = {}
      ['molfile', 'smiles', 'cano_smiles', 'canonical smiles', 'decoupled'].each do |check|
        @mandatory_check[check] = true if header.find { |e| /^\s*#{check}?/i =~ e }
      end

      message = 'Column headers should have: molfile, or Smiles (or cano_smiles, canonical smiles)'
      raise message if mandatory_check.empty?
    end

    def extract_molfile_and_molecule(row)
      if molfile?(row)
        get_data_from_molfile(row)
      elsif smiles?(row)
        get_data_from_smiles(row)
      end
    end

    def process_row(data)
      row = [header, xlsx.row(data)].transpose.to_h
      is_decoupled = row['decoupled']
      return unless structure?(row) || is_decoupled

      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    def process_row_data(row)
      is_decoupled = row['decoupled']
      return Molecule.find_or_create_dummy if is_decoupled && !structure?(row)

      molecule, molfile = extract_molfile_and_molecule(row)
      return if molfile.nil? || molecule.nil?

      [molecule, molfile]
    end

    def molecule_not_exist(molecule)
      @unprocessable << { row: row, index: i } if molecule.nil?
      molecule.nil?
    end

    def write_to_db
      unprocessable_count = 0
      begin
        ActiveRecord::Base.transaction do
          rows.map.with_index do |row, i|
            molecule, molfile = process_row_data(row)
            if molecule_not_exist(molecule)
              unprocessable_count += 1
              next
            end
            sample_save(row, molfile, molecule)
          rescue StandardError => _e
            unprocessable_count += 1
            @unprocessable << { row: row, index: i }
          end
        end
      rescue StandardError => _e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def structure?(row)
      molfile?(row) || smiles?(row)
    end

    def molfile?(row)
      mandatory_check['molfile'] && row['molfile'].to_s.present?
    end

    def smiles?(row)
      header = mandatory_check['smiles'] || mandatory_check['cano_smiles'] || mandatory_check['canonical smiles']
      cell = row['smiles'].to_s.present? || row['cano_smiles'].to_s.present? || row['canonical smiles'].to_s.present?
      header && cell
    end

    def get_data_from_molfile_and_smiles(row)
      molfile = row['molfile'].presence
      if molfile
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
        molfile_smiles = babel_info[:smiles]
        molfile_smiles = Chemotion::OpenBabelService.canon_smiles_to_smiles molfile_smiles if mandatory_check['smiles']
      end
      if molfile_smiles.blank? && (molfile_smiles != row['cano_smiles'] &&
         molfile_smiles != row['smiles'] && molfile_smiles != row['canonical smiles'])
        @unprocessable << { row: row, index: i }
        go_to_next = true
      end
      [go_to_next, molfile]
    end

    def get_data_from_molfile(row)
      molfile = row['molfile'].to_s
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
      inchikey = babel_info[:inchikey]
      molecule = Molecule.find_or_create_by_molfile(molfile, babel_info) if inchikey.presence
      [molecule, molfile]
    end

    def assign_molecule_data(molfile_coord, babel_info, inchikey, row)
      if inchikey.blank?
        @unprocessable << { row: row, index: i }
        go_to_next = true
      else
        molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: false) do |molecul|
          pubchem_info =
            Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
          molecul.molfile = molfile_coord
          molecul.assign_molecule_data babel_info, pubchem_info
        end
      end
      [molecule, molfile_coord, go_to_next]
    end

    def get_data_from_smiles(row)
      smiles = (mandatory_check['smiles'] && row['smiles'].presence) ||
               (mandatory_check['cano_smiles'] && row['cano_smiles'].presence) ||
               (mandatory_check['canonical smiles'] && row['canonical smiles'].presence)
      inchikey = Chemotion::OpenBabelService.smiles_to_inchikey smiles
      ori_molf = Chemotion::OpenBabelService.smiles_to_molfile smiles
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(ori_molf)
      molfile_coord = Chemotion::OpenBabelService.add_molfile_coordinate(ori_molf)
      assign_molecule_data(molfile_coord, babel_info, inchikey, row)
    end

    def included_fields
      Sample.attribute_names - excluded_fields
    end

    def construct_solvents_array(solvents)
      solvents_array = solvents.split('-')
      solvents_array.map(&:capitalize)
    end

    def handle_sample_solvent_column(sample, row)
      return unless row['solvent'].is_a? String

      solvent_array = construct_solvents_array(row['solvent'])
      solvent_column = []
      solvent_array.each do |element|
        solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(element) }
        next if solvent.blank?

        solvent_column.push({ label: solvent[:value][:external_label],
                              smiles: solvent[:value][:smiles],
                              ratio: '1' })
      end
      sample['solvent'] = '' if sample['solvent'].is_a? String
      sample['solvent'] = solvent_column unless solvent_column.empty?
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

    def format_molarity_value(value, type)
      return if value.empty?

      if type == 'value'
        value.to_f
      else
        molarity_unit_exists = value.match?(MOLARITY_UNIT)
        molarity_unit_exists ? 'M' : nil
      end
    end

    def assign_molecule_name_id(sample, value)
      split_names = value.split(';')
      molecule_name_id = MoleculeName.find_by(name: split_names[0]).id
      sample['molecule_name_id'] = molecule_name_id
    end

    def handle_sample_fields(sample, db_column, value)
      case db_column
      when 'cas', 'refractive_index'
        handle_xref_fields(sample, db_column, value)
      when 'mn.name'
        assign_molecule_name_id(sample, value)
      when 'flash_point'
        handle_flash_point(sample, value)
      when 'density'
        handle_density(sample, value)
      when 'molarity'
        handle_molarity(sample, value)
      else
        handle_default_fields(sample, db_column, value)
      end
    end

    def handle_xref_fields(sample, db_column, value)
      return sample if value.nil?

      sample['xref'][db_column] ||= {}
      sample['xref'][db_column] = value
    end

    def handle_flash_point(sample, value)
      return sample if value[:unit].nil? || value[:value].nil?

      sample['xref']['flash_point'] ||= {}
      sample['xref']['flash_point']['value'] = value[:value]
      sample['xref']['flash_point']['unit'] = value[:unit]
    end

    def handle_density(sample, value)
      return sample if value[:unit].nil? || value[:value].nil?

      sample['density'] = value[:value] if value[:unit].match?(DENSITY_UNIT)
    end

    def handle_molarity(sample, value)
      return sample if value[:unit].nil? || value[:value].nil?

      sample['molarity_value'] = value[:value]
      sample['molarity_unit'] = value[:unit]
    end

    def handle_default_fields(sample, db_column, value)
      sample[db_column] = value || ''
    end

    # rubocop:disable Style/StringLiterals
    def process_fields(sample, map_column, field, row, molecule)
      array = ["\"cas\""]
      conditions = map_column.nil? || array.include?(map_column[1])
      db_column = conditions ? field : (map_column[0].sub('s.', '').delete!('"') || map_column[0].sub('s.', ''))
      molecule.create_molecule_name_by_user(row[field], current_user_id) if field == 'molecule name'
      process_sample_fields(sample, db_column, field, row)
    end
    # rubocop:enable Style/StringLiterals

    def process_value(value, db_column)
      fields_with_units = %w[density molarity flash_point].freeze
      comparison_values = %w[melting_point boiling_point].freeze
      if comparison_values.include?(db_column)
        format_to_interval_syntax(value)
      elsif fields_with_units.include?(db_column)
        to_value_unit_format(value, db_column)
      else
        value
      end
    end

    def clean_value(value)
      string = value&.gsub(/\s+/, ' ')
      string&.strip
    end

    def extract_numerical_value(value)
      cleaned_value = clean_value(value)
      numerical_match = cleaned_value.scan(/\b\d+(?:\.\d+)?\b/).first if cleaned_value
      numerical_match&.to_f
    end

    def unit_regex_pattern(db_column)
      units = {
        'density' => DENSITY_UNIT,
        'molarity' => MOLARITY_UNIT,
        'flash_point' => FLASH_POINT_UNIT,
      }

      if db_column == 'flash_point'
        # Create a regex pattern for matching the unit as a standalone word
        /(?<!\S)(#{units[db_column]})(?!\S)/
      else
        units[db_column]
      end
    end

    def normalize_molarity_unit(unit, db_column)
      molarity_units = %w[m/l mol/L].freeze
      db_column == 'molarity' && molarity_units.include?(unit) ? 'M' : unit
    end

    def extract_unit(value, db_column)
      cleaned_value = clean_value(value)
      unit_pattern = unit_regex_pattern(db_column)
      unit = cleaned_value&.match(unit_pattern)&.to_s

      normalize_molarity_unit(unit, db_column)
    end

    def to_value_unit_format(value, db_column)
      numerical_value = extract_numerical_value(value)
      unit_match = extract_unit(value, db_column) || nil

      return { value: nil, unit: nil } if numerical_value.nil? || unit_match.nil?

      { value: numerical_value, unit: unit_match }
    end

    def process_sample_fields(sample, db_column, field, row)
      additional_columns = %w[
        cas
        mn.name
        molarity
        refractive_index
        flash_point
        density
        location
        melting_point
        purity
      ].freeze
      return unless included_fields.include?(db_column) || additional_columns.include?(db_column)

      excluded_column = %w[description solvent].freeze
      val = row[field]
      value = process_value(val, db_column)
      handle_sample_fields(sample, db_column, value) unless value.nil?
      sample[db_column] = '' if excluded_column.include?(db_column) && val.nil?
      sample[db_column] = assign_decoupled_value(val) if %w[decoupled].include?(db_column)
    end

    def assign_decoupled_value(value)
      return false if value.nil?

      if value.is_a?(String)
        return false unless value.casecmp('yes').zero? || value == '1'

        value = true
      end
      value
    end

    def save_chemical(chemical, sample)
      chemical.sample_id = sample.id
      chemical.save!
    end

    def validate_sample_and_save(sample, stereo, row)
      handle_sample_solvent_column(sample, row)
      sample.validate_stereo(stereo)
      sample.collections << Collection.find(collection_id)
      sample.collections << Collection.get_all_collection_for_user(current_user_id)
      sample.inventory_sample = true if @import_type == 'chemical'
      chemical = ImportChemicals.build_chemical(row, header) if @import_type == 'chemical'
      sample.save!
      save_chemical(chemical, sample) if @import_type == 'chemical'
      processed.push(sample)
    end

    def create_sample_and_assign_molecule(current_user_id, molfile, molecule)
      sample = Sample.new(created_by: current_user_id)
      sample.molfile = molfile
      sample.molecule = molecule
      sample
    end

    def sample_save(row, molfile, molecule)
      sample = create_sample_and_assign_molecule(current_user_id, molfile, molecule)
      stereo = {}
      header.each do |field|
        stereo[Regexp.last_match(1)] = row[field] if field.to_s.strip =~ /^stereo_(abs|rel)$/
        map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == "\"#{field}\"" }
        process_fields(sample, map_column, field, row, molecule)
      end
      validate_sample_and_save(sample, stereo, row)
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
        # 'dry_solvent',
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
        # 'xref',
        # 'molarity_value',
        # 'molarity_unit',
        'molecule_name_id',
      ]
    end

    def error_process_file(error)
      { status: 'invalid',
        message: 'Can not process this type of file.',
        error: error,
        data: [] }
    end

    def error_required_fields(error)
      { status: 'invalid',
        error: error,
        message: 'Column headers should have: molfile or Canonical Smiles.',
        data: [] }
    end

    def error_process(error)
      { status: 'invalid',
        error: error,
        message: 'Error while parsing the file.',
        data: [] }
    end

    def no_success(error)
      { status: 'invalid',
        error: error,
        message: "No samples could be imported for file #{@file_name} " \
                 "because of the following error #{error}.",
        unprocessed_data: unprocessable }
    end

    def warning(error = nil)
      { status: 'warning',
        error: error,
        message: "following rows in file: #{@file_name} " \
                 "could not be imported: #{unprocessable_rows}.",
        unprocessed_data: unprocessable,
        data: processed }
    end

    def unprocessable_rows
      unprocessable.map { |u| u[:index] + 2 }.join(', ')
    end

    def success
      { status: 'ok',
        message: "samples in file: #{@file_name} have been imported successfully",
        data: processed }
    end
  end
end
# rubocop:enable Metrics/ClassLength
