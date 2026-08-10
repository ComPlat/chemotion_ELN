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

    # Columns whose cell carries its own unit and is stored as a value/unit pair.
    FIELDS_WITH_UNITS = %w[molarity flash_point].freeze

    XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    # The column the report writes back, and the one that turns a row from "create a sample" into
    # "change this existing sample".
    SAMPLE_ID_HEADER = 'sample id'

    BULLET = '•'
    # Beyond this many row numbers the list stops being readable; the report carries the rest.
    MAX_LISTED_ROWS = 12

    # Columns accepted beyond the sample attributes themselves.
    ADDITIONAL_COLUMNS = %w[
      cas mn.name molarity refractive_index flash_point density location melting_point purity form
      color solubility inventory_label
    ].freeze
    BLANKED_WHEN_EMPTY = %w[description solvent].freeze
    BOOLEAN_COLUMNS = %w[decoupled is_top_secret dry_solvent].freeze

    # Columns a structure can arrive in, most specific first.
    STRUCTURE_HEADERS = ['molfile', 'canonical smiles', 'canonical_smiles', 'cano_smiles', 'smiles'].freeze

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
      # rows[i] came from sheet row @row_numbers[i]. Kept alongside rather than inside the row hash so
      # that reported row numbers survive rows being skipped: `index + 2` was only correct while no
      # earlier row had been dropped, and every skipped or unreadable row shifted every number after
      # it -- naming a row that had imported fine while the broken one went unmentioned.
      @row_numbers = []
      @unprocessable = []
      @processed = []

      # sheet row number => [{ header:, value:, note: }] for cells that could not be used as written.
      @field_notes = {}
      # Set while a row is being written, so the coercion notes it produces can be filed against it.
      @current_row_number = nil
      # Rows that changed an existing sample rather than creating one, by sheet row number.
      @updated_rows = []

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
      # 'sample id' counts: a sheet of corrections names the samples to change and needs no structure
      # column at all, which is exactly what the report's retry sheet hands back for dropped values.
      header_fields = ['molfile', 'smiles', 'cano_smiles', 'canonical_smiles', 'canonical smiles',
                       'decoupled', 'cas', SAMPLE_ID_HEADER]
      header_fields.each do |check|
        # Escape the literal and keep the prefix match, so trailing qualifiers like "molfile (V2000)" still work
        @mandatory_check[check] = true if header.find { |e| /^\s*#{Regexp.escape(check)}/i =~ e }
      end
      message = 'Column headers should have: molfile, Smiles (or cano_smiles, canonical smiles), CAS, ' \
                'decoupled, or sample id'
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
          if m.present? && !go_to_next
            note_unusable_molfile(row)
            return [m, raw_molfile]
          end
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

      @row_numbers << data
      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    # The sheet row a queued row came from. Falls back to the old assumption if the two arrays ever
    # disagree, so a reporting gap can never take the import down with it.
    def sheet_row(index)
      @row_numbers[index] || (index + 2)
    end

    # A row with nothing to resolve a structure from is still worth importing: an inventory list that
    # names substances without drawing them is a real and common file, and refusing it silently loses
    # the user's data. The one row that is not imported is the one that contradicts itself -- no
    # structure, no CAS, and 'decoupled' answered "No", which asserts a structure that was never given.
    def importable_row?(row)
      # A row that names a sample is an instruction to change that sample, so it needs nothing else.
      return true if sample_id_value(row).present?
      return true if structure?(row) || cas?(row) || decoupled?(row)
      return false unless row_has_content?(row)

      !refuses_decoupling?(row)
    end

    def row_has_content?(row)
      row.any? { |_key, value| value.to_s.strip.present? }
    end

    # True only when the column was answered, and answered with something other than yes.
    def refuses_decoupling?(row)
      row_value_case_insensitive(row, 'decoupled').to_s.strip.present? && !decoupled?(row)
    end

    def note_skipped_row(row_number, values)
      @skipped_rows << row_number if values.any? { |value| value.to_s.strip.present? }
      nil
    end

    def process_row_data(row, index)
      # Nothing to resolve from and nothing to look up: this is a decoupled sample whether or not the
      # column said so, and there is no point putting it through structure resolution to find out.
      if no_structure_or_cas?(row)
        # Decoupled because the row asked for it is not the same as decoupled because there was nothing
        # to resolve. Only the second is worth reporting -- from the user's side an empty SMILES column
        # looks identical to a successful import.
        note_decoupled_fallback(row, index) unless decoupled?(row)
        return Molecule.find_or_create_dummy
      end

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

      reason = @structure_errors[index] || decoupled_fallback_reason(row)
      @decoupled_fallbacks << { index: index, reason: reason }
      note_structure_cell(row, reason)
    end

    # Flags the cell the structure was supposed to come from, so the report points at the column the
    # user has to fix instead of only saying the row lost its structure.
    def note_structure_cell(row, reason)
      structure_header = STRUCTURE_HEADERS.find { |key| row_value_case_insensitive(row, key).to_s.present? }
      return if structure_header.nil?

      actual_header = header.find { |name| name.to_s.strip.casecmp(structure_header).zero? } || structure_header
      note_field_issue(actual_header, row_value_case_insensitive(row, structure_header), reason)
    end

    # The row still imported, from its SMILES, but the molfile column it also carried is unusable and
    # the user is the only one who can fix it.
    def note_unusable_molfile(row)
      molfile_header = header.find { |name| name.to_s.strip.casecmp('molfile').zero? }
      return if molfile_header.nil?

      note_field_issue(molfile_header, row_value_case_insensitive(row, 'molfile'),
                       'molfile could not be interpreted, the structure was taken from the SMILES column instead')
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
        "Import #{@file_name}: structure on row #{sheet_row(index)} could not be parsed: #{e.class}: #{e.message}",
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
      @current_row_number = sheet_row(index)
      ActiveRecord::Base.transaction(requires_new: true) do
        if sample_id_value(row).present?
          update_row(row, index)
          saved = true
        else
          molecule, molfile = process_row_data(row, index)
          unless molecule_not_exist(molecule, row, index)
            sample_save(row, molfile, molecule, index, force_decoupled: molfile.nil?)
            saved = true
          end
        end
      end
      saved
    rescue StandardError => e
      Rails.logger.warn("Import #{@file_name}: row #{sheet_row(index)} could not be imported: #{e.class}: #{e.message}")
      unless @unprocessable.any? { |u| u[:index] == index }
        @unprocessable << { row: row, index: index, reason: failure_reason(e) }
      end
      false
    ensure
      @current_row_number = nil
    end

    # A row that names an existing sample changes it in place. This is what makes the report's retry
    # sheet work: it hands back the values that could not be used, and importing the corrected sheet
    # applies them to the samples that already exist instead of creating duplicates.
    #
    # Only the cells that carry something are applied. A blank cell means "leave this field as it is",
    # which is what lets the retry sheet ship a row with two fields filled in and everything else empty.
    def update_row(row, index)
      sample = updatable_sample(sample_id_value(row))
      apply_present_fields(sample, row)
      sample.save!
      @updated_rows << sheet_row(index)
      processed.push(id: sample.id, short_label: sample.short_label, decoupled: sample.decoupled,
                     row: sheet_row(index), updated: true)
    end

    def apply_present_fields(sample, row)
      header.each do |field|
        next if row[field].to_s.strip.empty?
        next if report_only_header?(field)

        map_column = ReportHelpers::EXP_MAP_ATTR[:sample].values.find { |e| e[1] == "\"#{field}\"" }
        process_fields(sample, map_column, field, row, sample.molecule)
      end
      handle_sample_solvent_column(sample, row) if row['solvent'].present?
    end

    # Columns this importer writes into its own report. They describe an import; they are not sample
    # data, and re-importing a report must not try to store them.
    def report_only_header?(field)
      ImportReportWorkbook::EXTRA_HEADERS.any? { |own| own.casecmp(field.to_s.strip).zero? }
    end

    def sample_id_value(row)
      row_value_case_insensitive(row, SAMPLE_ID_HEADER).to_s.strip
    end

    # Deliberately one message for "does not exist" and "not yours": telling them apart would confirm
    # the existence of other people's samples to anyone willing to put ids in a spreadsheet.
    def updatable_sample(raw_id)
      raise "sample id #{raw_id.inspect} is not a number" unless raw_id.match?(/\A\d+\z/)

      sample = Sample.find_by(id: raw_id.to_i)
      raise "there is no sample with id #{raw_id} that you can change" unless updatable?(sample)

      sample
    end

    def updatable?(sample)
      sample.present? && import_user.present? && ElementPolicy.update?(import_user, sample)
    end

    def import_user
      return @import_user if defined?(@import_user)

      @import_user = User.find_by(id: current_user_id)
    end

    # Postgres messages are the only description of most row failures, but they are written for
    # whoever wrote the SQL. Trim the parts that mean nothing to the person holding the spreadsheet.
    def failure_reason(error)
      first_line = error.message.to_s.split("\n").first.to_s
      first_line.sub(/\A[^\n]*?\bERROR:\s*/, '').strip.presence || error.class.name
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
        Rails.logger.warn("Import #{@file_name}: CAS prefetch failed on row #{sheet_row(index)}: #{e.message}")
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

    # Arrives already parsed: a unit-less cell is accepted, because the column stores g/mL and so a
    # bare number is not ambiguous. Requiring an explicit unit meant a plain "0.789" was discarded and
    # the sample kept the column default of 0.0.
    def handle_density(sample, value)
      sample['density'] = value
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

    # Returns [value, note]. The note is nil when the cell was usable as written, and otherwise says
    # what had to be done to it -- see Import::ValueCoercion.
    def process_value(value, db_column)
      coerced = ValueCoercion.coerce(db_column, value)
      return coerced if coerced
      return value_with_unit(value, db_column) if FIELDS_WITH_UNITS.include?(db_column)

      [value, nil]
    end

    # Molarity and flash point are stored as a value/unit pair and are dropped unless the cell carries
    # both. The drop is left as it was; what is new is that it no longer happens in silence.
    def value_with_unit(value, db_column)
      pair = to_value_unit_format(value, db_column)
      return [pair, nil] if value.to_s.strip.empty? || pair[:value].present?

      [pair, "#{db_column.tr('_', ' ')} needs a number and a unit, value not used (#{value.to_s.strip.inspect})"]
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
      return unless importable_column?(db_column)

      assign_sample_field(sample, db_column, field, row)
    end

    def importable_column?(db_column)
      included_fields.include?(db_column) || ADDITIONAL_COLUMNS.include?(db_column)
    end

    def assign_sample_field(sample, db_column, field, row)
      val = row[field]
      value, note = process_value(val, db_column)
      note_field_issue(field, val, note) if note
      handle_sample_fields(sample, db_column, value) unless value.nil?
      sample[db_column] = '' if BLANKED_WHEN_EMPTY.include?(db_column) && val.nil?
      sample[db_column] = assign_boolean_value(val) if BOOLEAN_COLUMNS.include?(db_column)
    end

    # Files a cell that could not be used as written against the sheet row being written, for the
    # report workbook. Silent on its own: a note never changes whether the row is imported.
    def note_field_issue(header, raw_value, note)
      return if @current_row_number.nil?

      (@field_notes[@current_row_number] ||= []) << {
        header: header.to_s,
        value: raw_value.to_s,
        note: note,
      }
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
      processed.push(id: sample.id, short_label: sample.short_label, decoupled: sample.decoupled,
                     row: sheet_row(index))
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
      build_report

      if processed.empty?
        reason = rows.empty? ? 'no row contained a structure, a CAS number or a decoupled flag' : nil
        return no_success(reason)
      end

      return warning unless clean_import?

      success
    end

    # A clean import is one where every row in the file became a sample with the structure it asked for
    # and every value it carried. Anything less is a warning, so a partial result is never presented as
    # a success -- including a file that imported every row but lost cells on the way, which used to
    # report as a full success and say nothing about the values that were dropped.
    def clean_import?
      unprocessable.empty? && @skipped_rows.empty? && @decoupled_fallbacks.empty? &&
        @unreadable_rows.empty? && @unreadable_component_rows.empty? && @field_notes.empty?
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

    # Builds the workbook the user gets back and puts it in their Inbox.
    #
    # Best-effort by construction: a report that cannot be built must never turn a finished import
    # into a failed one, so every failure here is logged and swallowed.
    def build_report
      return if @report_built
      # nil? rather than blank?: Roo's sheet defines empty?(row, col), so blank? raises on it.
      return if @attachment.nil? || sheet.nil?

      @report_built = true
      @report_attachment = create_report_attachment
      replace_uploaded_file
    rescue StandardError => e
      Rails.logger.error("Import #{@file_name}: import report could not be built: #{e.class}: #{e.message}")
      @report_attachment = nil
    end

    # The report carries every value the uploaded file did, plus what became of each row, so leaving
    # both in the Inbox would give the user two copies of the same sheet and no reason to prefer one.
    #
    # Strictly after the report exists: if the report could not be built, the uploaded file is the only
    # copy the user has left and it stays where it is.
    def replace_uploaded_file
      return if @report_attachment.nil?

      @attachment.destroy
    rescue StandardError => e
      Rails.logger.warn("Import #{@file_name}: uploaded file could not be removed: #{e.class}: #{e.message}")
    end

    # Saved with attachable_id nil and attachable_type 'Container', which is what puts a file in the
    # Inbox as an unlinked attachment (see InboxService) -- the same place the uploaded file itself
    # sits. That also makes it downloadable by its owner and nobody else, since the attachment API
    # authorises exactly this shape.
    def create_report_attachment
      path = nil
      path = Rails.root.join('tmp', "import_report_#{SecureRandom.hex(8)}.xlsx")
      write_report_workbook(path)
      attachment = Attachment.new(
        filename: report_filename,
        file_path: path.to_s,
        created_by: current_user_id,
        created_for: current_user_id,
        attachable_type: 'Container',
        content_type: XLSX_CONTENT_TYPE,
      )
      attachment.save!
      attachment
    ensure
      # Saving copies the file into the attachment store, so the working copy is no longer needed.
      FileUtils.rm_f(path) if path
    end

    def write_report_workbook(path)
      sheet_rows = report_sheet_rows
      ImportReportWorkbook.new(
        file_name: @file_name,
        header: header,
        rows: sheet_rows,
        statuses: report_statuses(sheet_rows.keys),
        field_notes: @field_notes,
      ).write(path, sample_url: method(:sample_url), retry_sheet_name: retry_sheet_name)
    end

    # Named so that re-importing the report reads the retry sheet: set_main_sheet looks for 'sample',
    # or 'sample_chemicals' when the file is a chemical inventory.
    def retry_sheet_name
      @import_type == 'chemical' ? 'sample_chemicals' : ImportReportWorkbook::DEFAULT_RETRY_SHEET
    end

    # Built from the instance's own public URL (PUBLIC_URL, via config.root_url), so a report produced
    # on a production instance links into that instance rather than wherever it was developed.
    def sample_url(sample_id)
      base = Rails.application.config.root_url.presence
      return nil if base.nil?

      "#{base.chomp('/')}/mydb/collection/#{@collection_id}/sample/#{sample_id}"
    end

    def report_filename
      base = File.basename(@file_name.to_s, '.*').presence || 'import'
      "#{base}_import_report.xlsx"
    end

    # Every row of the sheet, read back as the importer saw it -- including the rows it never queued,
    # which are the ones the user most needs to see marked.
    def report_sheet_rows
      (2..sheet.last_row).each_with_object({}) do |number, memo|
        memo[number] = xlsx.row(number).values_at(0...header.length)
      rescue StandardError
        memo[number] = []
      end
    end

    def report_statuses(sheet_row_numbers)
      statuses = {}
      processed.each { |entry| statuses[entry[:row]] = imported_status(entry) }
      unprocessable.each do |entry|
        statuses[sheet_row(entry[:index])] = {
          status: ImportReportWorkbook::STATUS_FAILED,
          reason: entry[:reason].presence || 'this row could not be imported',
        }
      end
      add_not_imported_statuses(statuses, sheet_row_numbers)
      statuses
    end

    def add_not_imported_statuses(statuses, sheet_row_numbers)
      @unreadable_rows.each do |number|
        statuses[number] = { status: ImportReportWorkbook::STATUS_FAILED,
                             reason: 'this row could not be read from the sheet' }
      end
      @skipped_rows.each do |number|
        statuses[number] ||= { status: ImportReportWorkbook::STATUS_SKIPPED,
                               reason: "no structure and no CAS number, but 'decoupled' is set to no: " \
                                       'either give a structure or a CAS number, or set decoupled to yes' }
      end
      # Whatever is left was blank: neither imported, nor failed, nor worth a complaint.
      sheet_row_numbers.each do |number|
        statuses[number] ||= { status: ImportReportWorkbook::STATUS_SKIPPED, reason: 'empty row' }
      end
    end

    def imported_status(entry)
      { status: row_status(entry), sample_id: entry[:id], reason: decoupled_reason_for(entry[:row]) }
    end

    def row_status(entry)
      return ImportReportWorkbook::STATUS_IMPORTED_WITH_NOTES if @field_notes[entry[:row]].present?
      return ImportReportWorkbook::STATUS_UPDATED if entry[:updated]

      ImportReportWorkbook::STATUS_IMPORTED
    end

    def decoupled_reason_for(row_number)
      fallback = @decoupled_fallbacks.find { |f| sheet_row(f[:index]) == row_number }
      return nil if fallback.nil?
      # The flagged cell already carries this when the structure column could be pointed at; repeating
      # it at row level just makes the notes column harder to read.
      return nil if Array(@field_notes[row_number]).any? { |note| structure_header?(note[:header]) }

      "imported without a structure: #{fallback[:reason]}"
    end

    def structure_header?(name)
      STRUCTURE_HEADERS.any? { |key| name.to_s.strip.casecmp(key).zero? }
    end

    # The result is read in a toast, so it is built as a headline plus one bullet per thing that needs
    # attention, separated by newlines -- the notification renderer turns each line into its own
    # paragraph. As a single sentence the same content was a wall of text ending in a list of thirty-odd
    # row numbers that nobody could act on.
    def no_success(error)
      build_report
      { status: 'invalid',
        error: error,
        message: compose_message(
          "No rows could be imported from '#{@file_name}'.",
          error.presence && "Reason: #{error}",
        ) }.merge(result_payload)
    end

    def warning(error = nil)
      build_report
      { status: 'warning',
        error: error,
        message: compose_message(
          headline,
          error.presence && "The import stopped early: #{error}",
        ) }.merge(result_payload)
    end

    def success
      { status: 'ok', message: compose_message(headline) }.merge(result_payload)
    end

    def compose_message(headline_line, *leading_notes)
      notes = leading_notes + [
        failed_rows_note,
        updated_rows_note,
        structure_notes,
        skipped_rows_note,
        unreadable_rows_note,
        report_note,
      ]
      [headline_line, *notes.compact.map { |note| "#{BULLET} #{note}" }].join("\n")
    end

    def headline
      done = if @updated_rows.any?
               created = processed.size - @updated_rows.size
               "Imported #{created} and updated #{@updated_rows.size} of #{total_candidate_rows}"
             else
               "Imported #{processed.size} of #{total_candidate_rows}"
             end
      "#{done} #{'row'.pluralize(total_candidate_rows)} from '#{@file_name}' into '#{@collection.label}'."
    end

    def failed_row_numbers
      unprocessable.map { |u| sheet_row(u[:index]) }.sort
    end

    # Every row the file offered: those queued for import, those skipped before queuing, and those
    # that could not be read at all.
    def total_candidate_rows
      rows.size + @skipped_rows.size + @unreadable_rows.size
    end

    # "rows 2, 3, 5" -- truncated, because a bare list of thirty numbers is not something anyone reads.
    # The report carries all of them, one per line, next to the data they belong to.
    def rows_phrase(numbers)
      sorted = numbers.sort
      listed = sorted.first(MAX_LISTED_ROWS).join(', ')
      listed += " and #{sorted.size - MAX_LISTED_ROWS} more" if sorted.size > MAX_LISTED_ROWS
      "#{'row'.pluralize(sorted.size)} #{listed}"
    end

    def updated_rows_note
      return nil if @updated_rows.empty?

      "#{@updated_rows.size} existing #{'sample'.pluralize(@updated_rows.size)} updated from " \
        "#{rows_phrase(@updated_rows)}"
    end

    def failed_rows_note
      return nil if unprocessable.empty?

      "#{unprocessable.size} #{'row'.pluralize(unprocessable.size)} could not be imported: " \
        "#{rows_phrase(failed_row_numbers)}"
    end

    def skipped_rows_note
      return nil if @skipped_rows.empty?

      "#{@skipped_rows.size} #{'row'.pluralize(@skipped_rows.size)} skipped, with no structure and no " \
        "CAS number while 'decoupled' says no: #{rows_phrase(@skipped_rows)}"
    end

    def unreadable_rows_note
      notes = []
      if @unreadable_rows.any?
        notes << "#{@unreadable_rows.size} #{'row'.pluralize(@unreadable_rows.size)} could not be read " \
                 "from the sheet: #{rows_phrase(@unreadable_rows)}"
      end
      if @unreadable_component_rows.any?
        notes << "#{@unreadable_component_rows.size} " \
                 "#{'row'.pluralize(@unreadable_component_rows.size)} in the sample_components sheet " \
                 "could not be read: #{rows_phrase(@unreadable_component_rows)}"
      end
      notes.presence&.join("\n#{BULLET} ")
    end

    def result_payload
      {
        imported_count: processed.size,
        total_rows: total_candidate_rows,
        failed_rows: failed_row_numbers,
        skipped_rows: @skipped_rows.sort,
        unreadable_rows: @unreadable_rows.sort,
        unreadable_component_rows: @unreadable_component_rows.sort,
        decoupled_fallbacks: @decoupled_fallbacks,
        unprocessed_data: unprocessable,
        data: processed,
      }.merge(report_payload)
    end

    def report_payload
      return {} if @report_attachment.nil?

      { report_attachment_id: @report_attachment.id, report_filename: @report_attachment.filename }
    end

    def report_note
      return nil if @report_attachment.nil?

      "Report '#{@report_attachment.filename}' is in your Inbox - correct its '#{retry_sheet_name}' " \
        'sheet and import the file again to fix whatever did not work'
    end

    # Rows that were imported but lost their structure need to be visible in the result.
    def structure_notes
      decoupled_fallback_note
    end

    def decoupled_fallback_note
      return nil if @decoupled_fallbacks.empty?

      numbers = @decoupled_fallbacks.map { |f| sheet_row(f[:index]) }
      "#{numbers.size} #{'row'.pluralize(numbers.size)} imported without a structure, because none " \
        "could be resolved: #{rows_phrase(numbers)}"
    end
  end
end
# rubocop:enable Metrics/ClassLength
