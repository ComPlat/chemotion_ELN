# frozen_string_literal: true

require 'roo'

# rubocop:disable Metrics/ClassLength
module Import
  class ImportSamples
    attr_reader :xlsx, :sheet, :component_sheet, :header, :component_header, :sample_components_data,
                :mandatory_check, :mandatory_component_check, :rows,
                :unprocessable, :processed, :collection_id, :current_user_id, :file_name

    MOLARITY_UNIT = %r{m/L|mol/L|M}i.freeze

    DENSITY_UNIT = %r{g/mL|g/ml}i.freeze
    FLASH_POINT_UNIT = /°C|F|K/i.freeze

    def initialize(attachment, collection_id, user_id, file_name, import_type)
      @attachment = attachment
      @collection_id = collection_id
      @collection = Collection.find(collection_id)
      @all_collection = Collection.get_all_collection_for_user(user_id)
      @current_user_id = user_id
      @file_name = file_name
      @import_type = import_type

      @rows = []
      @unprocessable = []
      @processed = []

      @sample_with_components = []
      @sample_components_data = {}
    end

    def process
      begin
        read_file
      rescue StandardError => e
        return error_process_file(e.message)
      end

      begin
        check_required_fields
        check_required_component_fields
        parse_sample_components_data
      rescue StandardError => e
        return error_required_fields(e.message)
      end

      xlsx.default_sheet = xlsx.sheets.include?('sample_components') ? @main_sheet_name : xlsx.default_sheet

      begin
        process_all_rows
      rescue StandardError => e
        error_process(e.message)
      end
    end

    def read_file
      file = @attachment.attachment_attacher.get.to_io
      @xlsx = Roo::Spreadsheet.open(file, extension: @attachment.extname)
      set_main_sheet
      @header = sheet.row(1)
      load_component_sheet_if_exists
    end

    def set_main_sheet
      @main_sheet_name = if xlsx.sheets.include?('sample')
                           'sample'
                         elsif xlsx.sheets.include?('sample_chemicals')
                           'sample_chemicals'
                         else
                           xlsx.sheets.first
                         end
      @sheet = xlsx.sheet(@main_sheet_name)
    end

    def load_component_sheet_if_exists
      return unless xlsx.sheets.include?('sample_components')

      @component_sheet = xlsx.sheet('sample_components')
      @component_header = component_sheet.row(1).map(&:to_s).map(&:strip)
      @sample_with_components = extract_sample_uuids_with_components
    end

    def extract_sample_uuids_with_components
      sample_uuid_col = component_header.index('sample uuid') + 1
      component_sheet.column(sample_uuid_col).drop(1).compact.uniq
    end

    def component_sheet_exists?
      xlsx.sheets.include?('sample_components')
    end

    def check_required_fields
      @mandatory_check = {}
      header_fields = ['molfile', 'smiles', 'cano_smiles', 'canonical_smiles', 'canonical smiles', 'decoupled']
      header_fields.each do |check|
        @mandatory_check[check] = true if header.find { |e| /^\s*#{check}?/i =~ e }
      end
      message = 'Column headers should have: molfile, or Smiles (or cano_smiles, canonical smiles)'
      raise message if mandatory_check.empty?
    end

    def check_required_component_fields
      return unless component_sheet_exists?

      @mandatory_component_check = {}
      ['molfile', 'smiles', 'cano_smiles', 'canonical smiles'].each do |check|
        @mandatory_component_check[check] = true if component_header.any? { |e| /^\s*#{Regexp.escape(check)}\s*$/i =~ e }
      end
      raise 'Column headers in components sheet should have: molfile, or Smiles (or cano_smiles, canonical smiles)' if @mandatory_component_check.empty?
    end

    def row_to_hash(row)
      padded_row = row.fill(nil, row.length...@component_header.length)
      raw_hash = @component_header.zip(padded_row).to_h
      mapped_hash = {}
      raw_hash.each do |key, value|
        clean_key = key.to_s.strip.downcase.gsub(/\s*\([^)]*\)/, '').strip
        mapped_key = Import::ImportComponents::COMPONENT_HEADER_MAPPING[clean_key]
        mapped_hash[mapped_key] = value if mapped_key
      end
      mapped_hash
    end

    def parse_sample_components_data
      return unless component_sheet_exists?

      xlsx.default_sheet = 'sample_components'

      current_sample_uuid = nil
      sample_uuid_col = component_header.index('sample uuid')

      (2..component_sheet.last_row).each do |row_index|
        row_values = component_sheet.row(row_index)
        uuid_cell = row_values[sample_uuid_col].to_s.strip

        if uuid_cell.present?
          current_sample_uuid = uuid_cell
          @sample_components_data[current_sample_uuid] = []
        end

        next unless current_sample_uuid

        component_data = row_to_hash(row_values)
        next if component_data.empty?

        component_attributes = component_data.reject do |k, _|
          k.to_s.downcase.strip.in?(['sample name', 'sample external label', 'sample uuid'])
        end

        @sample_components_data[current_sample_uuid] << component_attributes if valid_component_data?(component_attributes)
      end
    end

    def valid_component_data?(component_attributes)
      component_attributes.values.any? { |v| !v.nil? && v != '' } && structure?(component_attributes)
    end

    def extract_molfile_and_molecule(row, index)
      if molfile?(row)
        molecule, raw_molfile = get_data_from_molfile(row)
        if molecule.present?
          [molecule, raw_molfile]
        elsif smiles?(row)
          m, _molfile_coord, go_to_next = get_data_from_smiles(row, index)
          return [m, raw_molfile] if m.present? && !go_to_next
          nil
        else
          nil
        end
      elsif smiles?(row)
        get_data_from_smiles(row, index)
      else
        nil
      end
    end

    def process_row(data)
      raw_row = xlsx.row(data)
      # Pad row to header length so transpose works when row has fewer columns than header
      padded_row = raw_row.values_at(0...header.length)
      row = [header, padded_row].transpose.to_h
      is_decoupled = row_value_case_insensitive(row, 'decoupled')
      unless structure?(row) || is_decoupled
        return
      end

      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    def process_row_data(row, index)
      is_decoupled = row_value_case_insensitive(row, 'decoupled')
      return Molecule.find_or_create_dummy if is_decoupled && !structure?(row)

      molecule, molfile = extract_molfile_and_molecule(row, index)
      if molfile.nil? || molecule.nil?
        return
      end
      [molecule, molfile]
    end

    def process_component_row_data(component_row, index)
      molecule, molfile = extract_molfile_and_molecule(component_row, index)
      return nil if molfile.nil? || molecule.nil?

      molecule
    end

    def molecule_not_exist(molecule, row, index)
      @unprocessable << { row: row, index: index } if molecule.nil?
      molecule.nil?
    end

    def write_to_db
      unprocessable_count = 0
      begin
        ActiveRecord::Base.transaction do
          rows.map.with_index do |row, i|
            molecule, molfile = process_row_data(row, i)
            if molecule_not_exist(molecule, row, i)
              unprocessable_count += 1
              next
            end
            sample_save(row, molfile, molecule)
          rescue StandardError => e
            unprocessable_count += 1
            @unprocessable << { row: row, index: i } unless @unprocessable.any? { |u| u[:index] == i }
          end
        end
      rescue StandardError => e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def structure?(row)
      molfile?(row) || smiles?(row)
    end

    def molfile?(row)
      check = determine_sheet(xlsx)
      return false unless check['molfile'].present?

      row_value_case_insensitive(row, 'molfile').to_s.present?
    end

    def smiles?(row)
      keys = ['smiles', 'cano_smiles', 'canonical_smiles', 'canonical smiles']
      header_present = keys.any? { |key| determine_sheet(xlsx)[key] }
      cell_present = keys.any? { |key| row_value_case_insensitive(row, key).to_s.present? }
      header_present && cell_present
    end

    def get_data_from_molfile(row)
      raw_molfile = row_value_case_insensitive(row, 'molfile').to_s.strip
      raw_molfile = unescape_textnode_octal_in_molfile(raw_molfile)
      # When molfile has polymer/text-node SDF blocks, do not pass to Open Babel; keep for sample.
      if raw_molfile.include?('> <')
        return [nil, raw_molfile]
      end

      sanitized = sanitize_molfile_for_import(raw_molfile)
      molfile_for_babel = sanitized.dup
      molfile_for_babel = "\n#{molfile_for_babel}" unless molfile_for_babel.start_with?("\n")
      molfile_for_babel = "#{molfile_for_babel}\n" unless molfile_for_babel.end_with?("\n")
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile_for_babel)
      inchikey = babel_info[:inchikey]
      molecule = Molecule.find_or_create_by_molfile(molfile_for_babel, babel_info) if inchikey.presence
      [molecule, raw_molfile]
    end

    def assign_molecule_data(molfile_coord, babel_info, inchikey, _row, _index)
      if inchikey.blank?
        go_to_next = true
      else
        go_to_next = false
        molecule = Molecule.find_or_create_by(inchikey: inchikey, is_partial: false) do |molecul|
          pubchem_info =
            Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
          molecul.molfile = molfile_coord
          molecul.assign_molecule_data babel_info, pubchem_info
        end
      end
      [molecule, molfile_coord, go_to_next]
    end

    def get_data_from_smiles(row, index)
      check = determine_sheet(xlsx)

      smiles = (check['smiles'] && row_value_case_insensitive(row, 'smiles').presence) ||
               (check['cano_smiles'] && row_value_case_insensitive(row, 'cano_smiles').presence) ||
               (check['canonical_smiles'] && row_value_case_insensitive(row, 'canonical_smiles').presence) ||
               (check['canonical smiles'] && row_value_case_insensitive(row, 'canonical smiles').presence)
      smiles = sanitize_smiles_for_ob(smiles)
      return nil if smiles.blank?

      inchikey = Chemotion::OpenBabelService.smiles_to_inchikey(smiles)
      ori_molf = Chemotion::OpenBabelService.smiles_to_molfile(smiles)
      return nil if ori_molf.blank?

      ori_molf = "\n#{ori_molf}" unless ori_molf.start_with?("\n")
      ori_molf = "#{ori_molf}\n" unless ori_molf.end_with?("\n")
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(ori_molf)
      molfile_coord = Chemotion::OpenBabelService.add_molfile_coordinate(ori_molf)
      inchikey = babel_info[:inchikey] if inchikey.blank? && babel_info.present?
      return nil if inchikey.blank?

      assign_molecule_data(molfile_coord, babel_info, inchikey, row, index)
    end

    def included_fields
      Sample.attribute_names - excluded_fields
    end

    def construct_solvents_array(solvents)
      solvents_array = solvents.split('/')
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

    # Format melting/boiling point to interval syntax
    def format_to_interval_syntax(row_field)
      return "[#{-Float::INFINITY}, #{Float::INFINITY}]" if row_field.nil?

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
      when 'cas', 'refractive_index', 'form', 'color', 'solubility', 'inventory_label'
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
      if field == 'molecule name' && row[field].present?
        molecule.create_molecule_name_by_user(row[field], current_user_id)
      end
      process_sample_fields(sample, db_column, field, row)
    end
    # rubocop:enable Style/StringLiterals

    def process_value(value, db_column)
      fields_with_units = %w[density molarity flash_point].freeze
      fields_with_float_values = %w[real_amount_value target_amount_value purity refractive_index molecular_mass].freeze
      comparison_values = %w[melting_point boiling_point].freeze
      if comparison_values.include?(db_column)
        format_to_interval_syntax(value)
      elsif fields_with_units.include?(db_column)
        to_value_unit_format(value, db_column)
      elsif fields_with_float_values.include?(db_column)
        value.to_f
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
      numerical_match = cleaned_value.scan(/[-+]?\d+(?:\.\d+)?/).first if cleaned_value
      numerical_match&.to_f
    end

    def unit_regex_pattern(db_column)
      units = { 'density' => DENSITY_UNIT, 'molarity' => MOLARITY_UNIT, 'flash_point' => FLASH_POINT_UNIT }
      if db_column == 'flash_point'
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
        form
        color
        solubility
        inventory_label
      ].freeze
      return unless included_fields.include?(db_column) || additional_columns.include?(db_column)

      excluded_column = %w[description solvent].freeze
      val = row[field]
      value = process_value(val, db_column)
      handle_sample_fields(sample, db_column, value) unless value.nil?
      sample[db_column] = '' if excluded_column.include?(db_column) && val.nil?
      sample[db_column] = assign_boolean_value(val) if %w[decoupled is_top_secret dry_solvent].include?(db_column)
    end

    def assign_boolean_value(value)
      return false if value.nil?

      if value.is_a?(String)
        return false unless value.casecmp('yes').zero? || value == '1' || value.casecmp('true').zero?

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
      sample.collections << @collection
      sample.collections << @all_collection
      sample.inventory_sample = true if @import_type == 'chemical'
      chemical = ImportChemicals.build_chemical(row, header) if @import_type == 'chemical'
      sample.sample_type = Sample::SAMPLE_TYPE_MIXTURE if sample_has_components?(row)
      sample.save!
      save_chemical(chemical, sample) if @import_type == 'chemical'
      handle_sample_components(row, sample) if sample_has_components?(row)
      create_polymer_residue_if_needed(sample, row)
      processed.push(sample)
    end

    def create_polymer_residue_if_needed(sample, row)
      return if sample.residues.any?

      residue_type = row_value_case_insensitive(row, 'residue_type').to_s.strip
      has_polymer_molfile = sample.molfile.to_s.include?('> <')
      return unless residue_type == 'polymer' || has_polymer_molfile

      polymer_type = row_value_case_insensitive(row, 'polymer_type').to_s.strip
      loading = row_value_case_insensitive(row, 'loading').to_s.strip
      loading_type = row_value_case_insensitive(row, 'loading_type').to_s.strip
      custom_info = {}
      custom_info['polymer_type'] = polymer_type if polymer_type.present?
      custom_info['loading'] = loading if loading.present?
      custom_info['loading_type'] = loading_type if loading_type.present?

      sample.residues.create!(residue_type: 'polymer', custom_info: custom_info)
    rescue StandardError
      # ignore validation/creation errors
    end

    def sample_has_components?(sample_row)
      sample_uuid = row_value_case_insensitive(sample_row, 'sample uuid')
      sample_uuid.present? && @sample_with_components.include?(sample_uuid)
    end

    def handle_sample_components(sample_row, sample)
      sample_uuid = row_value_case_insensitive(sample_row, 'sample uuid')
      sample_components_data = @sample_components_data.with_indifferent_access[sample_uuid]
      return if sample_components_data.blank?

      create_components(sample, sample_components_data)
    end

    def create_components(sample, sample_components_data)
      unprocessable_count = 0
      xlsx.default_sheet = 'sample_components'

      begin
        ActiveRecord::Base.transaction do
          sample_components_data.each_with_index do |component_data, index|
            molecule = process_component_row_data(component_data, index)

            if molecule_not_exist(molecule, component_data, index)
              unprocessable_count += 1
              next
            end

            ImportComponents.component_save(component_data, sample, molecule, index)
          end
        end
      rescue StandardError => _e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def determine_sheet(xlsx)
      xlsx.default_sheet == 'sample_components' ? @mandatory_component_check : mandatory_check
    end

    def row_value_case_insensitive(row, key)
      key_str = key.to_s.strip
      found = row.keys.find { |k| k.to_s.strip.casecmp(key_str).zero? }
      row[found] if found
    end

    # Remove control chars and BOM so Open Babel accepts the SMILES string (e.g. from Excel).
    def sanitize_smiles_for_ob(smiles)
      return nil if smiles.nil?

      s = smiles.to_s.encode('UTF-8', invalid: :replace, undef: :replace)
      s = s.gsub(/\p{C}+/, ' ').strip
      s.presence
    end

    # Keep only the CTAB (up to and including M END). Strip SDF blocks (e.g. > <...>) that can
    # cause molecule_info_from_molfile to return blank inchikey.
    def sanitize_molfile_for_import(molfile)
      return molfile if molfile.blank?

      molfile = molfile.to_s.force_encoding('UTF-8')
      lines = molfile.lines
      m_end_index = lines.index { |line| line.match?(/\s*M\s+END\s*/i) }
      if m_end_index
        lines[0..m_end_index].join.rstrip
      elsif (idx = molfile.index(/\sM\s+END\s/i))
        end_marker = molfile.match(/\sM\s+END\s/i)[0]
        molfile[0..(idx + end_marker.length - 1)].rstrip
      else
        molfile
      end
    end

    # Restore Unicode in TextNode labels: Excel/export can turn e.g. ∀ into literal \342\210\200
    # (octal UTF-8 byte sequences). Convert them back to the actual UTF-8 characters.
    def unescape_textnode_octal_in_molfile(molfile)
      return molfile if molfile.blank?

      molfile = molfile.to_s
      return molfile unless molfile.include?('> <')

      molfile.gsub(/> \s*([\s\S]*?)\s*> <\/TextNode>/i) do
        content = Regexp.last_match(1)
        converted = content.gsub(/(?:\\[0-7]{1,3})+/) do |seq|
          bytes = seq.scan(/\\([0-7]{1,3})/).flatten.map { |o| o.to_i(8) }
          bytes.pack('C*').force_encoding('UTF-8')
        end
        "> \n#{converted}\n> "
      end
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
      last_row = sheet.last_row
      (2..last_row).each do |data|
        process_row(data)
      end

      begin
        write_to_db
        if processed.empty?
          no_success('No samples could be processed from file')
        elsif @unprocessable.empty?
          # Clean up attachment if import was successful
          @attachment.destroy if @attachment.present?
          success
        else
          warning
        end
      rescue StandardError => e
        warning(e.message)
      end
    end

    def excluded_fields
      %w[
        id created_at updated_at molecule_id molfile impurities ancestry created_by
        short_label deleted_at sample_svg_file user_id identifier fingerprint_id molecule_name_id
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
        message: "samples in file: #{@file_name} have been imported successfully in collection '#{@collection.label}'.",
        data: processed }
    end
  end
end
# rubocop:enable Metrics/ClassLength
