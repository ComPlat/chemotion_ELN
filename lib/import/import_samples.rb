# frozen_string_literal: true

require 'roo'
require 'digest'
require Rails.root.join('lib/chemotion/molfile_polymer_support')

# rubocop:disable Metrics/ClassLength
module Import
  class ImportSamples
    attr_reader :xlsx, :sheet, :component_sheet, :header, :component_header, :sample_components_data,
                :mandatory_check, :mandatory_component_check, :rows,
                :unprocessable, :processed, :collection_id, :current_user_id, :file_name

    MOLARITY_UNIT = %r{m/L|mol/L|M}i.freeze

    DENSITY_UNIT = %r{g/mL|g/ml}i.freeze
    FLASH_POINT_UNIT = /°C|F|K/i.freeze

    # Rows are committed in batches rather than in one transaction spanning the whole file. This
    # bounds how much the database and this process have to hold at once, and means a failure part
    # way through a large import keeps the batches that already succeeded instead of discarding
    # everything.
    BATCH_SIZE = 100

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

      # Rows whose structure could not be resolved and which were therefore imported without one.
      @decoupled_fallbacks = []
      # Spreadsheet row numbers that had content but no structure, CAS or decoupled flag.
      @skipped_rows = []
      # Row index => why the structure toolkit refused the structure, for the result message.
      @structure_errors = {}
      # Spreadsheet row numbers that could not even be read out of the sheet.
      @unreadable_rows = []
      @unreadable_component_rows = []

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
      rescue StandardError => e
        return error_required_fields(e.message)
      end

      begin
        # Separated from the header checks above: a failure while parsing the components sheet or
        # selecting the active sheet is not a missing-header problem and should not be reported as such.
        parse_sample_components_data
        xlsx.default_sheet = xlsx.sheets.include?('sample_components') ? @main_sheet_name : xlsx.default_sheet
      rescue StandardError => e
        return error_prepare(e.message)
      end

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
      @component_header = component_sheet.row(1).map { |c| c.to_s.strip }
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
      header_fields = ['molfile', 'smiles', 'cano_smiles', 'canonical_smiles', 'canonical smiles', 'decoupled', 'cas']
      header_fields.each do |check|
        # Escape the literal and keep the prefix match, so trailing qualifiers like "molfile (V2000)" still work
        @mandatory_check[check] = true if header.find { |e| /^\s*#{Regexp.escape(check)}/i =~ e }
      end
      message = 'Column headers should have: molfile, Smiles (or cano_smiles, canonical smiles), CAS, or decoupled'
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
        # One unreadable component row must not abandon the components sheet -- and it certainly must
        # not fail the whole import
        current_sample_uuid = parse_component_row(row_index, sample_uuid_col, current_sample_uuid)
      rescue StandardError => e
        Rails.logger.warn(
          "Import #{@file_name}: component row #{row_index} could not be read: #{e.class}: #{e.message}",
        )
        @unreadable_component_rows << row_index
      end
    end

    # Returns the sample uuid in effect after this row
    def parse_component_row(row_index, sample_uuid_col, current_sample_uuid)
      row_values = component_sheet.row(row_index)
      uuid_cell = row_values[sample_uuid_col].to_s.strip

      if uuid_cell.present?
        current_sample_uuid = uuid_cell
        @sample_components_data[current_sample_uuid] = []
      end

      return current_sample_uuid unless current_sample_uuid

      component_data = row_to_hash(row_values)
      return current_sample_uuid if component_data.empty?

      component_attributes = component_data.reject do |k, _|
        k.to_s.downcase.strip.in?(['sample name', 'sample external label', 'sample uuid'])
      end

      if valid_component_data?(component_attributes)
        @sample_components_data[current_sample_uuid] << component_attributes
      end

      current_sample_uuid
    end

    def valid_component_data?(component_attributes)
      component_attributes.values.any? { |v| !v.nil? && v != '' } && structure?(component_attributes)
    end

    def extract_molfile_and_molecule(row, index)
      if molfile?(row)
        molecule, raw_molfile = get_data_from_molfile(row)
        if molecule.present?
          [molecule, raw_molfile]
        elsif raw_molfile.to_s.include?(Chemotion::MolfilePolymerSupport::POLYMERS_LIST_TAG)
          # Polymer molfile but molecule not created (e.g. inchikey blank); do not fall back to smiles or we get same dummy molecule for every row.
          nil
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
      return note_skipped_row(data, padded_row) unless importable_row?(row)

      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    def importable_row?(row)
      structure?(row) || decoupled?(row) || cas?(row)
    end

    def note_skipped_row(row_number, values)
      @skipped_rows << row_number if values.any? { |value| value.to_s.strip.present? }
      nil
    end

    def process_row_data(row, index)
      return Molecule.find_or_create_dummy if decoupled?(row) && no_structure_or_cas?(row)

      molecule, molfile = molecule_and_molfile_with_cas_fallback(row, index)
      ## import sample as decoupled if no structure information is available
      if molfile.nil? || molecule.nil?
        # The row is still imported, but without a structure. Record it: a silent downgrade looks
        # identical to a successful import from the user's side, so an unnoticed typo in a SMILES
        # column would quietly produce structureless samples.
        note_decoupled_fallback(row, index)
        return Molecule.find_or_create_dummy
      end

      [molecule, molfile]
    end

    def no_structure_or_cas?(row)
      !structure?(row) && !cas?(row)
    end

    def decoupled?(row)
      assign_boolean_value(row_value_case_insensitive(row, 'decoupled')).present?
    end

    def note_decoupled_fallback(row, index)
      return if @decoupled_fallbacks.any? { |f| f[:index] == index }

      @decoupled_fallbacks << {
        index: index,
        reason: @structure_errors[index] || decoupled_fallback_reason(row),
      }
    end

    def decoupled_fallback_reason(row)
      if structure?(row)
        'structure could not be interpreted'
      elsif cas?(row)
        "no structure found for CAS #{cas_value(row)}"
      else
        'no structure or CAS given'
      end
    end

    # Resolve molecule/molfile from structure - fall back to CAS lookup when structure is missing.
    def molecule_and_molfile_with_cas_fallback(row, index)
      molecule, molfile = resolve_structure(row, index)
      return [molecule, molfile] unless (molfile.nil? || molecule.nil?) && cas?(row)

      molecule = find_molecule_by_cas(cas_value(row))
      [molecule, molecule&.molfile]
    end

    # A structure the toolkit refuses to parse is "no structure resolved" as far as this importer is
    # concerned, so it has to reach the CAS and decoupled fallbacks the same way a blank cell does.
    # Without this the exception travels straight to write_row's rescue and the row is dropped, which
    # silently defeats both fallbacks for exactly the input they exist to handle.
    #
    # Database failures are deliberately re-raised
    def resolve_structure(row, index)
      extract_molfile_and_molecule(row, index)
    rescue ActiveRecord::ActiveRecordError
      raise
    rescue StandardError => e
      @structure_errors[index] = "structure could not be parsed: #{e.message}"
      Rails.logger.warn(
        "Import #{@file_name}: structure on row #{index + 2} could not be parsed: #{e.class}: #{e.message}",
      )
      nil
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

    # Enrichment is scheduled once, in the ensure below, and cannot be started earlier here the
    # way Import::ImportSdf#find_or_create_mol_by_batch does.
    #
    # The reason is the transaction below: every row is written inside one transaction, so no
    # molecule is visible to another connection until the whole import commits. A job enqueued
    # mid-loop would find nothing — and could not even run, since its delayed_jobs row would be
    # written inside the same uncommitted transaction. Starting enrichment early here would mean
    # committing in chunks, which would change this import from all-or-nothing to partially
    # applied on failure. That is a deliberate trade not made.
    # Rows are written in batches, each in its own transaction, and each row inside a savepoint.
    def write_to_db
      started_at = Time.current
      @defer_pubchem_lookup = true
      unprocessable_count = 0

      # Resolve CAS numbers before opening any transaction
      prefetch_cas_molecules

      rows.each_slice(BATCH_SIZE).with_index do |batch, batch_index|
        unprocessable_count += write_batch(batch, batch_index * BATCH_SIZE, batch_index)
      end

      unprocessable_count
    ensure
      Molecule.schedule_lcss_since(started_at)
    end

    # One transaction per batch. Returns how many of its rows could not be imported.
    def write_batch(batch, offset, batch_index)
      failed = 0
      ActiveRecord::Base.transaction do
        batch.each_with_index do |row, position|
          failed += 1 unless write_row(row, offset + position)
        end
      end
      failed
    rescue StandardError => e
      # The batch transaction itself failed rather than an individual row. Report this batch and
      # carry on with the next one instead of discarding the whole import.
      Rails.logger.error("Import #{@file_name}: batch #{batch_index} failed: #{e.class}: #{e.message}")
      mark_batch_unprocessable(batch, offset)
    end

    # Flags every not-yet-reported row in a batch as unprocessable; returns how many were added.
    def mark_batch_unprocessable(batch, offset)
      batch.each_with_index.count do |row, position|
        index = offset + position
        next false if @unprocessable.any? { |u| u[:index] == index }

        @unprocessable << { row: row, index: index }
        true
      end
    end

    # Writes one row inside a savepoint. Returns true when the sample was saved
    def write_row(row, index)
      saved = false
      ActiveRecord::Base.transaction(requires_new: true) do
        molecule, molfile = process_row_data(row, index)
        unless molecule_not_exist(molecule, row, index)
          sample_save(row, molfile, molecule, index, force_decoupled: molfile.nil?)
          saved = true
        end
      end
      saved
    rescue StandardError => e
      Rails.logger.warn("Import #{@file_name}: row #{index + 2} could not be imported: #{e.class}: #{e.message}")
      @unprocessable << { row: row, index: index } unless @unprocessable.any? { |u| u[:index] == index }
      false
    end

    # Resolves every distinct CAS number in the file once, outside a transaction, so the lookups are
    # neither repeated per row nor performed while holding one open.
    def prefetch_cas_molecules
      return unless mandatory_check.is_a?(Hash) && mandatory_check['cas']

      rows.each_with_index do |row, index|
        next unless cas?(row)
        # Only rows that need the fallback: a row with a usable structure never hits CAS lookup.
        next if structure?(row)

        find_molecule_by_cas(cas_value(row))
      rescue StandardError => e
        Rails.logger.warn("Import #{@file_name}: CAS prefetch failed on row #{index + 2}: #{e.message}")
      end
    ensure
      Molecule.schedule_pubchem_lookup_since(started_at)
    end

    def structure?(row)
      molfile?(row) || smiles?(row)
    end

    def molfile?(row)
      check = determine_sheet(xlsx)
      return false if check['molfile'].blank?

      row_value_case_insensitive(row, 'molfile').to_s.present?
    end

    def smiles?(row)
      keys = ['smiles', 'cano_smiles', 'canonical_smiles', 'canonical smiles']
      header_present = keys.any? { |key| determine_sheet(xlsx)[key] }
      cell_present = keys.any? { |key| row_value_case_insensitive(row, key).to_s.present? }
      header_present && cell_present
    end

    def cas?(row)
      cas_value(row).present?
    end

    # Excel headers arrive with whatever casing the user typed ('CAS', 'Cas', 'cas '). Every other
    # column in this importer is read case-insensitively; reading row['cas'] directly would make a
    # file whose header is 'CAS' pass check_required_fields and then silently resolve no CAS at all.
    def cas_value(row)
      row_value_case_insensitive(row, 'cas').to_s.strip
    end

    def find_molecule_by_cas(cas_nr)
      return nil if cas_nr.blank?

      @molecule_cas_cache ||= {}
      return @molecule_cas_cache[cas_nr] if @molecule_cas_cache.key?(cas_nr)

      begin
        result = Chemotion::CasLookupService.fetch_by_cas(cas_nr)
        smiles = result[:smiles]

        if smiles.present?
          molecule = Molecule.find_or_create_by_cano_smiles(smiles, defer_lcss: @defer_lcss)
          @molecule_cas_cache[cas_nr] = molecule
          return molecule
        end
      rescue StandardError => e
        Rails.logger.warn "CAS lookup failed for #{cas_nr}: #{e.message}"
      end

      @molecule_cas_cache[cas_nr] = nil
      nil
    end

    # When Open Babel returns blank inchikey for a PolymersList molfile, create a molecule with a synthetic
    # inchikey so we can store the full molfile; SVG is generated in the common branch via svg_reprocess.
    def find_or_create_polymer_molecule_without_inchikey(raw_molfile, babel_info)
      synthetic_inchikey = "POLYMER_#{Digest::SHA256.hexdigest(raw_molfile)}"
      formula = babel_info[:formula].to_s.presence || ''
      molecule = Molecule.find_by(inchikey: synthetic_inchikey, is_partial: true, sum_formular: formula)
      if molecule
        molecule.molfile = raw_molfile
      else
        molecule = Molecule.new(
          inchikey: synthetic_inchikey,
          is_partial: true,
          sum_formular: formula,
          molfile: raw_molfile,
        )
      end
      molecule.save!
      molecule
    end

    def get_data_from_molfile(row)
      @polymer_svg_file_after_reprocess = nil
      raw_molfile = row_value_case_insensitive(row, 'molfile').to_s.strip
      # When molfile has > <PolymersList>, use full molfile and Molecule.svg_reprocess so polymers use SvgRenderer.
      if raw_molfile.include?(Chemotion::MolfilePolymerSupport::POLYMERS_LIST_TAG)
        result = Import::PolymerMoleculeResolver.call(raw_molfile, defer_pubchem_lookup: @defer_pubchem_lookup)
        return [result.molecule, result.raw_molfile]
      end

      sanitized = sanitize_molfile_for_import(raw_molfile)
      molfile_for_babel = sanitized.dup
      molfile_for_babel = "\n#{molfile_for_babel}" unless molfile_for_babel.start_with?("\n")
      molfile_for_babel = "#{molfile_for_babel}\n" unless molfile_for_babel.end_with?("\n")
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile_for_babel, render_svg: false)
      inchikey = babel_info[:inchikey]
      if inchikey.presence
        molecule = Molecule.find_or_create_by_molfile(molfile_for_babel,
                                                      defer_pubchem_lookup: @defer_pubchem_lookup,
                                                      **babel_info)
      end
      [molecule, raw_molfile]
    end

    # Delegates to {Molecule.find_or_create_by_molfile} rather than re-implementing
    # find-or-create. This branch used to key its lookup on
    # +(inchikey, sum_formular, is_partial: false)+, but Molecule#assign_molecule_data assigns
    # +is_partial+ from babel_info *after* +check_sum_formular+ has already returned early on
    # the still-false value. An R-group structure was therefore INSERTed as
    # +is_partial: true+ having been looked up as +false+ — a different tuple from the one it
    # was searched under, so the next import missed it and inserted another row, and its
    # masses kept the fictitious CH3 that check_sum_formular should have removed.
    # find_or_create_by_molfile derives both +is_partial+ and the CH3-stripped formula before
    # its lookup, and carries the savepoint and RecordNotUnique rescue.
    #
    # +inchikey+ is passed on explicitly: the caller may have resolved it from the SMILES
    # (Chemotion::OpenBabelService.smiles_to_inchikey) when babel_info's own is blank, and
    # find_or_create_by_molfile keys on babel_info[:inchikey] — it would otherwise re-derive
    # babel_info from the molfile and give up entirely (returning nil, dropping the row) if
    # that second attempt is blank too.
    #
    # @return [Array(Molecule, String, Boolean)] +[molecule, molfile, go_to_next]+; +molecule+
    #   is nil when the structure could not be resolved
    def assign_molecule_data(molfile_coord, babel_info, inchikey, _row, _index)
      return [nil, molfile_coord, true] if inchikey.blank?

      # babel_info may be nil — get_data_from_smiles guards on `babel_info.present?` two lines
      # before calling this, so a molfile OpenBabel could not read while smiles_to_inchikey
      # still resolved a key is a reachable combination.
      info = (babel_info || {}).merge(inchikey: inchikey)
      molecule = Molecule.find_or_create_by_molfile(molfile_coord, defer_pubchem_lookup: @defer_pubchem_lookup, **info)
      [molecule, molfile_coord, false]
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
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(ori_molf, render_svg: false)
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

    def validate_sample_and_save(sample, stereo, row, index = nil)
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
      processed.push(id: sample.id, short_label: sample.short_label, decoupled: sample.decoupled)
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

    # NB: always called nested inside #write_to_db's row loop (via
    # handle_sample_components), which already has @defer_pubchem_lookup set — a
    # component's molecule creation is deferred the same way as the outer
    # row's, and both flush together via #write_to_db's own Molecule.schedule_pubchem_lookup_since.
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
      Chemotion::MolfilePolymerSupport.keep_only_ctab(molfile)
    end

    def create_sample_and_assign_molecule(current_user_id, molfile, molecule)
      sample = Sample.new(created_by: current_user_id)
      sample.molfile = molfile
      sample.molecule = molecule
      sample
    end

    def sample_save(row, molfile, molecule, index = nil, force_decoupled: false)
      sample = create_sample_and_assign_molecule(current_user_id, molfile, molecule)
      stereo = {}
      header.each do |field|
        stereo[Regexp.last_match(1)] = row[field] if field.to_s.strip =~ /^stereo_(abs|rel)$/
        map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == "\"#{field}\"" }
        process_fields(sample, map_column, field, row, molecule)
      end
      sample.decoupled = true if force_decoupled
      validate_sample_and_save(sample, stereo, row, index)
    end

    def process_all_rows
      read_all_rows

      begin
        write_to_db
        import_result
      rescue StandardError => e
        warning(e.message)
      end
    end

    def read_all_rows
      (2..sheet.last_row).each do |data|
        process_row(data)
      rescue StandardError => e
        Rails.logger.warn("Import #{@file_name}: row #{data} could not be read: #{e.class}: #{e.message}")
        @unreadable_rows << data
      end
    end

    def import_result
      if processed.empty?
        reason = rows.empty? ? 'no row contained a structure, a CAS number or a decoupled flag' : nil
        return no_success(reason)
      end

      return warning unless clean_import?

      @attachment.destroy if @attachment.present?
      success
    end

    # A clean import is one where every row in the file became a sample with the structure it asked
    # for. Anything less is reported as a warning so a partial result is never presented as a success.
    def clean_import?
      unprocessable.empty? && @skipped_rows.empty? && @decoupled_fallbacks.empty? &&
        @unreadable_rows.empty? && @unreadable_component_rows.empty?
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

    def error_prepare(error)
      { status: 'invalid',
        error: error,
        message: "The file #{@file_name} could not be prepared for import: #{error}.",
        data: [] }
    end

    def no_success(error)
      { status: 'invalid',
        error: error,
        message: [
          "No rows could be imported from file: #{@file_name}.",
          error.present? ? "Reason: #{error}." : nil,
          failed_rows_note,
          structure_notes,
          skipped_rows_note,
          unreadable_rows_note,
        ].compact.join(' ') }.merge(result_payload)
    end

    def warning(error = nil)
      { status: 'warning',
        error: error,
        message: [
          imported_count_sentence,
          failed_rows_note,
          error.present? ? "The import stopped early: #{error}." : nil,
          structure_notes,
          skipped_rows_note,
          unreadable_rows_note,
        ].compact.join(' ') }.merge(result_payload)
    end

    def success
      { status: 'ok',
        message: [
          imported_count_sentence,
          structure_notes,
          skipped_rows_note,
          unreadable_rows_note,
        ].compact.join(' ') }.merge(result_payload)
    end

    def unprocessable_rows
      unprocessable.map { |u| u[:index] + 2 }.sort.join(', ')
    end

    # Every row the file offered: those queued for import, those skipped before queuing, and those
    # that could not be read at all.
    def total_candidate_rows
      rows.size + @skipped_rows.size + @unreadable_rows.size
    end

    def unreadable_rows_note
      notes = []
      if @unreadable_rows.any?
        notes << "#{@unreadable_rows.size} row(s) could not be read from the sheet " \
                 "(row(s) #{@unreadable_rows.sort.join(', ')})."
      end
      if @unreadable_component_rows.any?
        notes << "#{@unreadable_component_rows.size} row(s) in the sample_components sheet could not " \
                 "be read (row(s) #{@unreadable_component_rows.sort.join(', ')})."
      end
      notes.empty? ? nil : notes.join(' ')
    end

    def imported_count_sentence
      "#{processed.size} of #{total_candidate_rows} row(s) in file: #{@file_name} " \
        "were imported into collection '#{@collection.label}'."
    end

    def failed_rows_note
      return nil if unprocessable.empty?

      "The following row(s) could not be imported: #{unprocessable_rows}."
    end

    def skipped_rows_note
      return nil if @skipped_rows.empty?

      "#{@skipped_rows.size} row(s) were skipped because they contained no structure, no CAS and no " \
        "decoupled flag (row(s) #{@skipped_rows.sort.join(', ')})."
    end

    def result_payload
      {
        imported_count: processed.size,
        total_rows: total_candidate_rows,
        failed_rows: unprocessable.map { |u| u[:index] + 2 }.sort,
        skipped_rows: @skipped_rows.sort,
        unreadable_rows: @unreadable_rows.sort,
        unreadable_component_rows: @unreadable_component_rows.sort,
        decoupled_fallbacks: @decoupled_fallbacks,
        unprocessed_data: unprocessable,
        data: processed,
      }
    end

    # Rows that were imported but lost their structure need to be visible in the result.
    def structure_notes
      decoupled_fallback_note
    end

    def decoupled_fallback_note
      return nil if @decoupled_fallbacks.empty?

      "#{@decoupled_fallbacks.size} row(s) were imported as decoupled because no structure could be " \
        "resolved (row(s) #{@decoupled_fallbacks.map { |f| f[:index] + 2 }.sort.join(', ')})."
    end
  end
end
# rubocop:enable Metrics/ClassLength
