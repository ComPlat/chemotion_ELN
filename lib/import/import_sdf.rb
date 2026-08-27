# frozen_string_literal: true

require 'charlock_holmes'
require Rails.root.join('lib/chemotion/molfile_polymer_support')

# Same disable as its parent Import::ImportSamples: this importer was already far past the 200-line
# limit before any of the recent work, and splitting it up is a refactor in its own right.
# rubocop:disable-next Metrics/ClassLength
class Import::ImportSdf < Import::ImportSamples
  attr_reader  :collection_id, :current_user_id, :processed_mol, :import_type,
               :inchi_array, :raw_data, :rows, :custom_data_keys, :mapped_keys, :unprocessable_samples,
               :decoupled_records, :coercion_notes

  SIZE_LIMIT = 40 # MB
  MOLFILE_BLOCK_END_LINE = 'M  END'

  # Extra target fields offered in the confirm grid when importing as a chemical inventory.
  # They are resolved to a Chemical record by ImportChemicals during create_samples.
  CHEMICAL_KEYS_TO_MAP = {
    status: { field: 'status', displayName: 'Status' },
    vendor: { field: 'vendor', displayName: 'Vendor' },
    order_number: { field: 'order_number', displayName: 'Order Number' },
    amount: { field: 'amount', displayName: 'Amount' },
    volume: { field: 'volume', displayName: 'Volume' },
    price: { field: 'price', displayName: 'Price' },
    person: { field: 'person', displayName: 'Person' },
    pictograms: { field: 'pictograms', displayName: 'Pictograms' },
    h_statements: { field: 'h_statements', displayName: 'H Statements' },
    p_statements: { field: 'p_statements', displayName: 'P Statements' },
    required_date: { field: 'required_date', displayName: 'Required Date' },
    ordered_date: { field: 'ordered_date', displayName: 'Ordered Date' },
    expiration_date: { field: 'expiration_date', displayName: 'Expiration Date' },
    delivery_date: { field: 'delivery_date', displayName: 'Delivery Date' },
    opening_date: { field: 'opening_date', displayName: 'Opening Date' },
    storage_temperature: { field: 'storage_temperature', displayName: 'Storage Temperature' },
    required_by: { field: 'required_by', displayName: 'Required By' },
    host_building: { field: 'host_building', displayName: 'Host Building' },
    host_room: { field: 'host_room', displayName: 'Host Room' },
    host_cabinet: { field: 'host_cabinet', displayName: 'Host Cabinet' },
    host_group: { field: 'host_group', displayName: 'Host Group' },
    owner: { field: 'owner', displayName: 'Owner' },
    current_building: { field: 'current_building', displayName: 'Current Building' },
    current_room: { field: 'current_room', displayName: 'Current Room' },
    current_cabinet: { field: 'current_cabinet', displayName: 'Current Cabinet' },
    current_group: { field: 'current_group', displayName: 'Current Group' },
    borrowed_by: { field: 'borrowed_by', displayName: 'Borrowed By' },
    disposal_info: { field: 'disposal_info', displayName: 'Disposal Info' },
    important_notes: { field: 'important_notes', displayName: 'Important Notes' },
    safety_sheet_link_merck: { field: 'safety_sheet_link_merck', displayName: 'Safety Sheet Link (Merck)' },
    product_link_merck: { field: 'product_link_merck', displayName: 'Product Link (Merck)' },
  }.freeze

  def initialize(args)
    @raw_data = args[:raw_data] || []
    @message = { error: [], info: [], error_messages: [] }
    @collection_id = args[:collection_id]
    @current_user_id = args[:current_user_id]
    @attachment = args[:attachment]
    @import_type = args[:import_type]
    @inchi_array = args[:inchikeys] || []
    @rows = args[:rows] || []
    @custom_data_keys = {}
    @mapped_keys = keys_to_map || {}
    @unprocessable_samples = []
    @decoupled_records = []
    @coercion_notes = []
    read_data

    @count = (@raw_data.empty? && @rows.size) || @raw_data.size
    if @count.zero?
      @message[:error] << 'No Molecule found!'
    else
      @message[:info] << "This file contains #{@count} Molecules."
    end
  end

  def keys_to_map
    base = {
      description: { field: 'description', displayName: 'Description', multiple: true },
      location: { field: 'location', displayName: 'Location' },
      name: { field: 'name', displayName: 'Name' },
      external_label: { field: 'external_label', displayName: 'External label' },
      purity: { field: 'purity', displayName: 'Purity' },
      molecule_name: { field: 'molecule_name', displayName: 'Molecule Name' },
      short_label: { field: 'short_label', displayName: 'Short Label' },
      real_amount: { field: 'real_amount', displayName: 'Real Amount' },
      real_amount_unit: { field: 'real_amount_unit', displayName: 'Real Amount Unit' },
      target_amount: { field: 'target_amount', displayName: 'Target Amount' },
      target_amount_unit: { field: 'target_amount_unit', displayName: 'Target Amount Unit' },
      molarity: { field: 'molarity', displayName: 'Molarity' },
      density: { field: 'density', displayName: 'Density' },
      melting_point: { field: 'melting_point', displayName: 'Melting Point' },
      boiling_point: { field: 'boiling_point', displayName: 'Boiling Point' },
      cas: { field: 'cas', displayName: 'Cas' },
      # Mapped so a record that declares itself structureless is taken at its word.
      decoupled: { field: 'decoupled', displayName: 'Decoupled' },
      solvent: { field: 'solvent', displayName: 'Solvent' },
      dry_solvent: { field: 'dry_solvent', displayName: 'Dry Solvent' },
      refractive_index: { field: 'refractive_index', displayName: 'Refractive index' },
      flash_point: { field: 'flash_point', displayName: 'Flash point' },
      solubility: { field: 'solubility', displayName: 'Solubility' },
      color: { field: 'color', displayName: 'Color' },
      form: { field: 'form', displayName: 'Form' },
      inventory_label: { field: 'inventory_label', displayName: 'Inventory Label' },
    }
    return base.merge(CHEMICAL_KEYS_TO_MAP) if @import_type == 'chemical'

    base
  end

  def read_data
    return unless @attachment

    begin
      file = @attachment.attachment_attacher.get.to_io
      file.rewind
      file_data = file.read
      size = file_data.bytesize
      if size.to_f < SIZE_LIMIT * (10**6)
        detection = CharlockHolmes::EncodingDetector.detect(file_data)
        encoded_file = CharlockHolmes::Converter.convert file_data, detection[:encoding], 'UTF-8'
        @raw_data = split_into_records(encoded_file)
      else
        @message[:error] << "File too large (over #{SIZE_LIMIT}MB). "
      end
    rescue StandardError => e
      @message[:error] << "Failed to read attachment file: #{e.message}"
    end
    @raw_data.pop if @raw_data[-1].blank?
  end

  # An MDL record is title / program / comment / counts. Some editors -- Ketcher, including the SDF
  # shipped in public/sdf -- omit the title line, so the counts line lands on line 3 and Open Babel
  # reads the first atom line as the counts line. It then returns a blank inchikey and no formula, and
  # the record is dropped with nothing but a "Problems reading the Count line" warning, which is why a
  # perfectly good single-molecule SDF imported zero samples.
  #
  # Restore the missing line only when the counts line is demonstrably one line early. Prepending
  # unconditionally would shift a well-formed record the other way and break it instead.
  COUNTS_LINE = /^\s*\d+\s+\d+.*V[23]000/.freeze

  def split_into_records(encoded_file)
    encoded_file.split(/\${4}\r?\n/).map { |record| restore_molfile_title_line(record) }
  end

  def restore_molfile_title_line(record)
    lines = record.to_s.lines
    return record if lines.size < 4
    return record if lines[3].to_s.match?(COUNTS_LINE) # counts already on line 4: well formed
    return "\n#{record}" if lines[2].to_s.match?(COUNTS_LINE) # counts on line 3: title line missing

    record
  end

  def message
    if @unprocessable_samples.empty?
      @message[:error].join("\n") + @message[:info].join("\n")
    else
      result = " Following samples could not be imported #{@unprocessable_samples}"
      @message[:error].join("\n") + @message[:info].join("\n") + result
    end
  end

  def error_messages
    @message[:error_messages]
  end

  def status
    (@message[:error].empty? && 'ok') || 'error'
  end

  def find_or_create_mol_by_batch(batch_size = 50)
    @processed_mol = []
    started_at = Time.current
    @defer_pubchem_lookup = true
    inchikeys = process_molecule_batches(raw_data.dup, batch_size, started_at)

    # Every record that produced an entry: one imported without a structure was processed too.
    count = processed_mol.compact.size
    if count.positive?
      @message[:info] << "#{count} Molecule#{(count > 1 && 's') || ''} processed. "
    else
      @message[:error] << 'No Molecule processed. '
    end
    @inchi_array += inchikeys.compact
  ensure
    # The completeness guarantee: whatever happened above, every molecule created since
    # started_at is queued at least once. Nothing in #process_molecule_batches is allowed to
    # become load-bearing for this.
    Molecule.schedule_pubchem_lookup_since(started_at)
  end

  # Consumes +data+ in batches, creating molecules and accumulating them into +@processed_mol+.
  #
  # Enrichment is kicked off as soon as the first batch has committed, so a long import does not
  # leave every molecule nameless until it finishes — on a 529-structure file that was ~80
  # minutes of waiting for a name the first 50 molecules could have had after 7.
  #
  # Once, not per batch. {Molecule.schedule_pubchem_lookup_since} enqueues with +created_after+
  # and no id list, so the job's scope is a lower bound with no upper one and its continuation
  # cursor is ascending id: molecules created by later batches have higher ids and fall inside
  # that same scope, so one job follows the import forward. {PubchemLookupJob} re-arms itself
  # while this import still holds its delayed_jobs lock, which is what keeps it following rather
  # than draining once and stopping. Enqueuing per batch instead would put one job in the queue
  # per 50 molecules — 1000 of them for a 50k import, the shape of a defect already fixed once.
  #
  # This works only because phase 1 has no surrounding transaction and each molecule commits on
  # its own, so a worker on another connection can see them. The xlsx/csv path now commits per row
  # too and could schedule earlier; it deliberately keeps one job for the whole file instead —
  # see the note on {Import::ImportSamples#write_to_db}.
  #
  # @param data [Array<String>] raw molfile records, consumed destructively
  # @param started_at [ActiveSupport::TimeWithZone] lower bound for the enrichment scope
  # @return [Array<String, nil>] one inchikey per record, nil where none could be resolved
  def process_molecule_batches(data, batch_size, started_at)
    inchikeys = []
    first_batch = true
    until data.empty?
      molecules = find_or_create_by_molfiles(data.slice!(0...batch_size))
      inchikeys += molecules.map { |m| (m && m[:inchikey]) || nil }
      @processed_mol += molecules
      Molecule.schedule_pubchem_lookup_since(started_at) if first_batch
      first_batch = false
    end
    inchikeys
  end

  # Runs the whole raw-SDF/mol import in one pass, off the web request (worker context):
  #   1. find/create a Molecule for every record (populates {#processed_mol} + inchi_array)
  #   2. turn the processed molecules into rows via the default {#keys_to_map}
  #   3. reuse {#create_samples}' rows path to create the Sample records
  #
  # @return [ActiveRecord::Relation] the created samples (see {#create_samples})
  def import_from_file
    find_or_create_mol_by_batch
    @rows = rows_from_processed_mol
    create_samples
  end

  # Maps {#processed_mol} (whose SDF property tags are upcased/underscored keys, e.g.
  # +"MOLECULE_NAME"+) onto the lowercase Sample field names declared in {#keys_to_map}.
  # This replaces the former interactive frontend column-mapping step: any SDF tag whose
  # name matches a known field is imported, everything else is ignored.
  #
  # @return [Array<Hash>] row hashes consumable by {#create_samples}' rows branch
  def rows_from_processed_mol
    field_by_upcase = mapped_keys.values.each_with_object({}) do |cfg, memo|
      field = cfg[:field].to_s
      memo[field.upcase] = field
    end

    processed_mol.each_with_index.filter_map do |mol, index|
      # Only a record with no entry at all has nothing to import; an unresolved one goes in decoupled.
      next note_unimportable_record(index) if mol.nil?

      row = row_from_mol(mol, field_by_upcase)
      next unless importable_record?(row, mol, index)

      row
    end
  end

  # A record with no structure and no values is a blank form, not data. Cf. ImportSamples#importable_row?.
  def importable_record?(row, mol, index)
    return true if mol[:inchikey].present?
    return false if row.except('molfile').values.all? { |value| value.to_s.strip.empty? }

    note_decoupled_record(index, mol[:decoupled_reason]) unless asked_for_decoupling?(row, mol)
    true
  end

  # Declaring itself decoupled excuses the report only if nothing was offered to resolve from: anything
  # offered and unusable stays reportable. Cf. ImportSamples#process_row_data.
  def asked_for_decoupling?(row, mol)
    assign_boolean_value(row['decoupled']) && !mol[:structure_offered]
  end

  def row_from_mol(mol, field_by_upcase)
    mol.each_with_object({ 'molfile' => mol[:molfile] }) do |(key, value), row|
      # SDF property tags are String keys; skip the merged :inchikey/:svg/:name/:molfile symbols
      next unless key.is_a?(String) && value.present?

      field = field_by_upcase[key.upcase]
      row[field] = value if field
    end
  end

  # 1-based, as #create_samples numbers its rows. nil drops the record from the caller's filter_map.
  def note_unimportable_record(index)
    @unprocessable_samples << (index + 1)
    nil
  end

  # A structureless sample is indistinguishable from a clean import unless the downgrade is recorded.
  def note_decoupled_record(index, reason)
    @decoupled_records << {
      record: index + 1,
      reason: reason.presence || 'no structure could be resolved',
    }
  end

  def is_number?(string)
    true if Float(string)
  rescue StandardError
    false
  end

  def create_samples
    started_at = Time.current
    @defer_pubchem_lookup = true
    ids = []
    read_data if raw_data.empty? && rows.empty?
    # rows.empty?, not inchi_array.empty?: this branch ignores rows, and a file that resolved no
    # structure at all has no inchikeys yet every row to import.
    if !raw_data.empty? && rows.empty?
      raw_data.each_with_index do |molfile, index|
        # See #release_connection_for_native_work. The transaction below wraps only the writes.
        release_connection_for_native_work
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile, render_svg: false)
        inchikey = babel_info[:inchikey]
        is_partial = babel_info[:is_partial]
        next unless inchikey.presence && (molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial))
        next unless (i = inchi_array.index(inchikey))

        ActiveRecord::Base.transaction(requires_new: true) do
          @inchi_array[i] = nil
          sample = Sample.new(
            created_by: current_user_id,
            molfile: molfile,
            molfile_version: babel_info[:molfile_version],
            molecule_id: molecule.id,
          )
          sample.collections << collection_for_import
          sample.collections << all_collections_for_user
          sample.save!
          ids << sample.id
        end
      rescue StandardError => e
        Rails.logger.error("SDF import: molecule #{index + 1} could not be imported: #{e.class}: #{e.message}")
        @unprocessable_samples << (index + 1)
      end
    elsif !rows.empty?
      begin
        attribs = Sample.attribute_names & @mapped_keys.keys
        error_messages = []
        rows.each_with_index do |row, i|
          next unless row

          @current_import_row_index = i

          # See #release_connection_for_native_work, called here before resolving the molecule
          # (native OpenBabel work) and opening the transaction that does the actual writes.
          release_connection_for_native_work
          resolved = resolve_molecule_for_row(row)
          next if resolved.first.blank?

          # Savepoint per row: without it a DB-level failure (e.g. from the chemical save below)
          # leaves PostgreSQL's transaction aborted, so the rescue below cannot contain it -- every
          # later row then fails. Each row is now its own top-level transaction rather than a
          # savepoint nested in one enclosing transaction, so no earlier row's connection/lock is
          # held across a later row's native work either.
          ActiveRecord::Base.transaction(requires_new: true) do
            sample = build_sample_from_row(resolved, row, attribs, error_messages)
            sample.collections << collection_for_import
            sample.collections << all_collections_for_user
            sample.save!
            save_chemical_for_row(sample, row) if @import_type == 'chemical'
            ids << sample.id
          end
        rescue StandardError => e
          Rails.logger.error("SDF import: row #{i + 1} could not be imported: #{e.class}: #{e.message}")
          @unprocessable_samples << (i + 1)
          error_messages << "Sample #{i + 1} could not be imported: #{e.message}"
        end
        if @unprocessable_samples.any?
          error_messages << "Following samples could not be imported #{@unprocessable_samples}."
        end
        @message[:error_messages] = error_messages if error_messages.present?
      rescue StandardError => e
        Rails.logger.error("SDF import: aborted: #{e.class}: #{e.message}")
        @message[:error] << "The import could not be completed: #{e.message}"
      end
    else
      @message[:error] << 'No sample selected. '
    end

    ids.compact!
    samples = Sample.where('id IN (?)', ids)
    s = ids.size
    @message[:error] << 'Could not create the samples! ' if samples.empty?
    @message[:info] << "Created #{s} sample#{s <= 1 && '' || 's'}. " if samples
    @message[:info] << decoupled_summary if @decoupled_records.any?
    @message[:info] << "Some values were adjusted while importing: #{coercion_summary}. " if @coercion_notes.any?
    @message[:info] << 'Import successful! ' if ids.size == @count

    # Keep the upload unless there is genuinely nothing to follow up on
    @attachment.destroy if keep_attachment_unnecessary?

    samples
  ensure
    Molecule.schedule_pubchem_lookup_since(started_at)
  end

  # Extracted from #create_samples' row loop so each step is separately readable -- the loop itself
  # only decides whether the row becomes a sample and how failures are reported. +resolved+ is the
  # [molecule, molfile_for_sample, babel_info] tuple the caller resolves with the connection released,
  # before the transaction this runs inside of.
  def build_sample_from_row(resolved, row, attribs, error_messages)
    molecule, molfile_for_sample, babel_info = resolved
    sample = new_sample_for_row(row, molecule, molfile_for_sample, babel_info)

    attribs.each { |attrib| sample[attrib] = row[attrib] if is_number?(row[attrib]) }
    assign_molecule_name(sample, molecule, row['molecule_name'])
    assign_plain_columns(sample, row)
    assign_measurement_columns(sample, row)

    error_columns = assign_amount_columns(sample, row)
    if error_columns.present?
      error_messages << "The columns#{error_columns} of sample " \
                        "#{molecule['iupac_name']} cannot be processed."
    end
    sample
  end

  # decoupled: no molfile to store, or the record asked for it -- even when its structure did resolve.
  def new_sample_for_row(row, molecule, molfile_for_sample, babel_info)
    sample = Sample.new(
      created_by: current_user_id,
      molfile: molfile_for_sample,
      molfile_version: babel_info[:molfile_version],
      molecule_id: molecule.id,
    )
    sample.decoupled = true if molfile_for_sample.nil? || assign_boolean_value(row['decoupled'])
    sample.inventory_sample = true if @import_type == 'chemical'
    sample
  end

  # Columns copied across as-is, plus the xref sub-hash ones.
  def assign_plain_columns(sample, row)
    %w[description location external_label name short_label dry_solvent].each do |key|
      sample[key] = row[key] if row[key].present?
    end
    %w[cas form color solubility inventory_label].each do |key|
      sample['xref'][key] = row[key] if row[key].present?
    end
    assign_coerced_xref(sample, 'refractive_index', row['refractive_index'])
  end

  # An xref key the coercer still handles, so the value reads the same from an SDF as from a sheet.
  def assign_coerced_xref(sample, key, raw)
    return if raw.blank?

    value, note = Import::ValueCoercion.coerce(key, raw)
    note_coercion_issue(key, note) if note
    sample['xref'][key] = value unless value.nil?
  end

  # Columns that need a unit or a range parsed out of the cell before they can be assigned.
  def assign_measurement_columns(sample, row)
    sample['melting_point'] = interval_from(row['melting_point'], 'melting_point') if row['melting_point'].present?
    sample['boiling_point'] = interval_from(row['boiling_point'], 'boiling_point') if row['boiling_point'].present?
    # Side effect only: the method assigns sample['solvent'] itself and returns nil on no match.
    handle_sample_solvent_column(sample, row) if row['solvent'].present?
    # Purity through the shared coercer: a cell written as a percentage ('95', '99%') is what the
    # samples table rejects outright, and assigning it raw here cost the whole row.
    assign_coerced(sample, 'purity', row['purity'])
    assign_density_and_molarity(sample, row)
    return if row['flash_point'].blank?

    handle_flash_point(sample, to_value_unit_format(row['flash_point'], 'flash_point'))
  end

  # A molarity is only taken when no density was given: the two describe the same amount of substance
  # differently and Sample derives one from the other.
  def assign_density_and_molarity(sample, row)
    density = row['density']
    # Also the shared coercer, so a unit-less density or a 'g/cm3' one reads the same as it does from a
    # spreadsheet rather than being dropped for not spelling the unit out as g/mL.
    assign_coerced(sample, 'density', density)
    return unless density.blank? && row['molarity'].present? && row['molarity'].match?(MOLARITY_UNIT)

    handle_molarity(sample, to_value_unit_format(row['molarity'], 'molarity'))
  end

  # Molfile properties first, then the spreadsheet's own amount columns, which win where they are
  # readable. Returns the label fragment for whatever could not be read, for the row's error message.
  def assign_amount_columns(sample, row)
    properties = process_molfile_opt_data(row['molfile'])
    sample.validate_stereo('abs' => properties['STEREO_ABS'], 'rel' => properties['STEREO_REL'])

    %w[target real].filter_map { |kind| assign_amount(sample, row, properties, kind) }.join
  end

  # Molfile optional-data block first, then the row's own amount cell, which wins where it is readable.
  # Kept in this order per kind (target fully, then real): the Sample setters are not independent, and
  # assigning both kinds' molfile values up front changes what the row cells resolve to.
  def assign_amount(sample, row, properties, kind)
    prefix = kind == 'target' ? 'TARGET' : 'REAL'
    { 'AMOUNT' => "#{kind}_amount_value=", 'UNIT' => "#{kind}_amount_unit=" }.each do |suffix, setter|
      value = properties["#{prefix}_#{suffix}"]
      sample.public_send(setter, value) if value.present?
    end

    assign_bare_amount(sample, row, kind)
  end

  # A single cell like '5 mg' carrying both value and unit, used when the file has no separate unit
  # column. Anything unreadable falls back to 0 g and is reported instead of guessed at.
  def assign_bare_amount(sample, row, kind)
    return nil if row["#{kind}_amount"].blank? || row["#{kind}_amount_unit"].present?

    sample.public_send("#{kind}_amount_value=", 0)
    sample.public_send("#{kind}_amount_unit=", 'g')

    value, unit = split_amount_cell(row["#{kind}_amount"])
    return " #{kind} amount, #{kind} amount unit ," if value.nil?

    sample.public_send("#{kind}_amount_value=", value)
    sample.public_send("#{kind}_amount_unit=", unit)
    nil
  end

  AMOUNT_UNITS = %w[g mg l ml mol].freeze

  # Import::ValueCoercion decides what a typed column can hold, so both importers store the same value
  # for the same cell. A cell it cannot read at all leaves the column at its default rather than
  # failing the row. Amount cells are not routed through it: those carry value and unit together here,
  # which is a spelling the coercer's separate value/unit columns do not describe.
  def assign_coerced(sample, column, raw)
    return if raw.blank?

    value, note = Import::ValueCoercion.coerce(column, raw)
    note_coercion_issue(column, note) if note
    sample[column] = value unless value.nil?
  end

  # '5 mg' -> ['5', 'mg']; anything that is not exactly a number followed by a known unit -> nil.
  def split_amount_cell(cell)
    parts = cell.to_s.split('/').first.to_s.scan(/\d+|\D+/)
    return nil unless parts.length == 2

    value = parts[0]
    # \p{Space} rather than String#strip: spreadsheet and SDF cells arrive with non-breaking spaces
    # that #strip leaves in place, which used to make a perfectly readable '10 g' unreadable.
    unit = parts[1].gsub(/\A\p{Space}*|\p{Space}*\z/, '')
    return nil unless is_number?(value) && AMOUNT_UNITS.include?(unit)

    [value, unit]
  end

  # SDF has no per-cell report to attach a note to the way the spreadsheet import's field_notes
  # does; record against the record's position in the file instead, the same convention
  # #note_decoupled_record uses.
  def note_coercion_issue(header, note)
    return if @current_import_row_index.nil?

    @coercion_notes << { record: @current_import_row_index + 1, header: header, note: note }
  end

  def coercion_summary
    @coercion_notes.map { |n| "record #{n[:record]} #{n[:header]}: #{n[:note]}" }.join('; ')
  end

  # Numbered by position in the file: an SDF has no row to point at.
  def decoupled_summary
    count = @decoupled_records.size
    numbers = @decoupled_records.pluck(:record).join(', ')
    reasons = @decoupled_records.pluck(:reason).uniq.join('; ')

    "#{count} sample#{'s' if count > 1} imported without a structure (#{reasons}): " \
      "record#{'s' if count > 1} #{numbers}. "
  end

  # A structureless import is something to follow up on, and the upload is the only copy to correct.
  def keep_attachment_unnecessary?
    @message[:error].empty? && @unprocessable_samples.empty? && @decoupled_records.empty? &&
      @coercion_notes.empty? && @attachment.present?
  end

  # Links the sample to the molecule's name.
  #
  # Molecule#create_molecule_name_by_user is built on Enumerable#each, so it returns its *input*
  # array of split names rather than the records it created. Calling .id on that raised
  # "undefined method `id' for [\"1-chloro-2-iodoethane\"]:Array" and lost the row, so every SDF
  # carrying a MOLECULE_NAME tag failed to import. Resolve the record by name instead, which also
  # covers the case where the name already existed and nothing new was created.
  # Taken from the same coercion the spreadsheet import uses, so a reversed range is normalised here
  # too instead of being handed to Postgres and losing the record; the note goes to #coercion_notes,
  # SDF's equivalent of the spreadsheet import's per-cell field notes.
  def interval_from(value, header)
    result, note = Import::ValueCoercion.range(value)
    note_coercion_issue(header, note) if note
    result
  end

  def assign_molecule_name(sample, molecule, raw_names)
    return if raw_names.blank?
    # DUMMY is shared instance-wide, so a name filed against it would surface on every decoupled
    # sample. The sample's own name column still gets the tag.
    return if molecule.inchikey == 'DUMMY'

    molecule.create_molecule_name_by_user(raw_names, current_user_id)
    first_name = raw_names.to_s.split(';').first.to_s.strip
    return if first_name.blank?

    molecule_name = molecule.molecule_names.reload.find_by(name: first_name)
    sample['molecule_name_id'] = molecule_name.id if molecule_name
  end

  # Build a Chemical from the mapped row fields (cas, status, person, pictograms, h/p statements, ...)
  # and link it to the freshly-created inventory sample. Mirrors the XLSX chemical import path.
  def save_chemical_for_row(sample, row)
    chemical = Import::ImportChemicals.build_chemical(row, row.keys)
    chemical.sample_id = sample.id
    chemical.save!
  end

  # Memoized: every imported sample joins the same two collections, so this only needs to run once
  # per import rather than once per record.
  def collection_for_import
    @collection_for_import ||= Collection.find(collection_id)
  end

  def all_collections_for_user
    @all_collections_for_user ||= Collection.get_all_collection_for_user(current_user_id)
  end

  # Releases the DB connection immediately before native OpenBabel work that can run seconds --
  # batched, minutes -- per call. Without this, a connection reaped for inactivity mid-call fails
  # every query that follows it instead of being transparently re-checked-out through
  # ActiveRecord::ConnectionPool#checkout_and_verify once the native call returns. Call this
  # immediately before the native call, with no transaction open around it.
  def release_connection_for_native_work
    ActiveRecord::Base.connection_pool.release_connection
  end

  def find_or_create_by_molfiles(molfiles)
    # See #release_connection_for_native_work. This is the larger of this file's three windows: one
    # call covers a whole batch of records, each of which can spend up to
    # Chemotion::OpenBabelService::CANONICAL_SMILES_TIMEOUT_SECONDS in native canonical-SMILES work --
    # minutes of wall clock for a 50-record batch of organometallics, with no SQL in between. The
    # per-record rescue below does not substitute for it: once the server has hung up, the connection
    # is never re-verified, so every remaining record in the import fails too.
    release_connection_for_native_work

    # render_svg: false — Molecule#assign_molecule_data discards OpenBabel's SVG and re-renders
    # via Chemotion::SvgRenderer, so rendering it per record is the largest avoidable cost on
    # this path: it is the only timeout-bounded operation in molecule_info_from_molfile, and on
    # organometallic files ~1 record in 10 burns the whole SVG render timeout before being
    # killed (measured at the 20 s default then in force; it is now 5 s and env-configurable).
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles, render_svg: false)

    babel_info_array.map.with_index do |babel_info, i|
      # Per-record rescue: unlike the OpenBabel work above (already guarded inside
      # molecule_info_from_molfiles), the Molecule find-or-create below is a real DB write with
      # no guard of its own. Before this, one dropped/reaped connection here escaped
      # this method, process_molecule_batches, and find_or_create_mol_by_batch entirely --
      # aborting the whole import uncaught, rather than just the one record.
      find_or_create_molecule_entry(molfiles[i], babel_info)
    rescue StandardError => e
      Rails.logger.error("SDF import: molecule entry #{i + 1} could not be resolved: #{e.class}: #{e.message}")
      nil
    end
  end

  # @return [Hash, nil] a preview entry for one record, or nil if none of the strategies below
  #   resolved a molecule
  def find_or_create_molecule_entry(molfile, babel_info)
    # has_polymer_content?, not has_polymers_list_tag?: an *empty* "> <PolymersList>" block is not
    # a polymer, and those records keep the ordinary resolution path.
    if Chemotion::MolfilePolymerSupport.has_polymer_content?(molfile.to_s)
      # rstrip, not strip: MOL line 1 (title) may legitimately be empty for Ketcher/ISIS molfiles;
      # a full strip would delete that blank line and shift the CTAB up by one, corrupting the
      # header (see Chemotion::MolfilePolymerSupport.normalize_for_open_babel, which only appends).
      find_or_create_polymer_molfile_entry(molfile.to_s.rstrip, babel_info)
    elsif babel_info && babel_info[:inchikey].present?
      molfile_entry_with_inchikey(molfile, babel_info)
    else
      molfile_entry_without_inchikey(molfile)
    end
  end

  # Build a preview entry for a molfile whose structure resolved to an inchikey.
  #
  # +molfile+ is the raw SDF record: #process_molfile_opt_data needs its data block to read the
  # tags. What is stored and rendered is the CTAB-only sanitized copy — the raw record still
  # carries the data block (including a possibly-empty "> <PolymersList>"/"> <TextNode>" tag,
  # since has_polymer_content? has already decided this record is NOT a polymer), which
  # SvgRenderer must never see or it re-triggers Indigo-first rendering with polymer-specific
  # options for an ordinary molecule.
  #
  # @param molfile [String] the raw SDF record, data block included
  # @param babel_info [Hash] Open Babel info for the record
  # @return [Hash] preview entry — tags from the raw record, structure from the sanitized one
  def molfile_entry_with_inchikey(molfile, babel_info)
    sanitized = sanitize_molfile(molfile)
    molecule = Molecule.find_or_create_by_molfile(sanitized, defer_pubchem_lookup: @defer_pubchem_lookup, **babel_info)
    process_molfile_opt_data(molfile).merge(
      inchikey: molecule.inchikey,
      svg: "molecules/#{molecule.molecule_svg_file}",
      name: molecule.iupac_name,
      molfile: sanitized,
    )
  end

  # Entry for a molfile that resolved nothing. Falls back the way the spreadsheet importer does --
  # SMILES, then CAS, then decoupled -- and carries the reason so the import can report it.
  def molfile_entry_without_inchikey(molfile)
    props = process_molfile_opt_data(molfile)
    molecule = molecule_from_smiles_tag(props) || molecule_from_cas_tag(props)
    unless molecule
      return props.merge(name: nil, inchikey: nil, svg: 'no_image_180.svg', decoupled: true,
                         decoupled_reason: decoupled_reason(props, molfile),
                         structure_offered: structure_offered?(props, molfile))
    end

    props.merge(
      inchikey: molecule.inchikey,
      svg: "molecules/#{molecule.molecule_svg_file}",
      name: molecule.iupac_name,
      molfile: molecule.molfile,
    )
  end

  # The spellings ImportSamples accepts as headers, most specific first, as #process_molfile_opt_data
  # normalises tag names: upcased, whitespace underscored.
  SMILES_TAGS = %w[CANONICAL_SMILES CANO_SMILES SMILES].freeze

  def smiles_tag(props)
    SMILES_TAGS.filter_map { |tag| props[tag].presence }.first
  end

  def cas_tag(props)
    cas_nr = props['CAS'].to_s.strip
    cas_nr.match?(/^\d+-\d+-\d+$/) ? cas_nr : nil
  end

  # Anything Open Babel refuses counts as "no structure here", so the CAS fallback still gets its turn.
  def molecule_from_smiles_tag(props)
    smiles = sanitize_smiles_for_ob(smiles_tag(props))
    return nil if smiles.blank?

    molecule = Molecule.find_or_create_by_cano_smiles(smiles, defer_pubchem_lookup: @defer_pubchem_lookup)
    molecule if molecule&.inchikey.present?
  rescue StandardError => e
    Rails.logger.warn("SDF import: SMILES tag #{smiles.inspect} could not be resolved: #{e.class}: #{e.message}")
    nil
  end

  def molecule_from_cas_tag(props)
    cas_nr = cas_tag(props)
    return nil if cas_nr.nil?

    find_molecule_by_cas(cas_nr)
  end

  # Whether the record offered anything to resolve from. A molfile block is always present, so only its
  # atom count distinguishes an empty form from a broken structure.
  def structure_offered?(props, molfile)
    smiles_tag(props).present? || cas_tag(props).present? || molfile_atom_count(molfile).positive?
  end

  def molfile_atom_count(molfile)
    text = molfile.to_s
    v3000 = text[/^M\s+V30\s+COUNTS\s+(\d+)/, 1]
    return v3000.to_i if v3000

    counts_line = text.lines.find { |line| line.match?(COUNTS_LINE) }
    counts_line.to_s.strip.split(/\s+/).first.to_i
  end

  # Names what was tried: nothing to resolve from and a CAS that resolved to nothing are different fixes.
  def decoupled_reason(props, molfile)
    tried = []
    tried << 'the molfile' if molfile_atom_count(molfile).positive?
    tried << 'a SMILES tag' if smiles_tag(props).present?
    tried << "CAS #{cas_tag(props)}" if cas_tag(props).present?
    return 'the record carries no structure and no CAS number' if tried.empty?

    "no structure could be resolved from #{tried.to_sentence}"
  end

  # When molfile has PolymersList/TextNode: keep full molfile, clean for babel, find/create molecule, reprocess SVG.
  def find_or_create_polymer_molfile_entry(raw_molfile, _babel_info_from_batch)
    result = Import::PolymerMoleculeResolver.call(raw_molfile, defer_pubchem_lookup: @defer_pubchem_lookup)
    # A polymer record has as much to fall back on as any other.
    return molfile_entry_without_inchikey(raw_molfile) if result.molecule.blank?

    process_molfile_opt_data(result.raw_molfile).merge(
      inchikey: result.molecule.inchikey,
      svg: "molecules/#{result.molecule.molecule_svg_file}",
      name: result.molecule.iupac_name,
      molfile: result.raw_molfile,
    )
  end

  def process_molfile_opt_data(molfile)
    mf = molfile.to_s
    custom_data = mf.scan(/^\>[^\n]*\<(.*?)\>[^\n]*[\n]*([^>]*)/m)
    Hash[custom_data.map do |key, value|
      k = key.to_s.strip.upcase.gsub(/\s/, '_')
      @custom_data_keys[k] = true
      [k, value.strip]
    end]
  end

  # Resolve [molecule, molfile_for_sample, babel_info] for a confirm-step row.
  # Falls back to the inchikey resolved during preview (CAS lookup), otherwise to a decoupled dummy.
  def resolve_molecule_for_row(row)
    molecule, molfile_for_sample, babel_info = molecule_and_molfile_for_row(row['molfile'])
    return [molecule, molfile_for_sample, babel_info || {}] if molecule.present?

    if row['inchikey'].present?
      molecule = Molecule.find_by(inchikey: row['inchikey'])
      return [molecule, molecule&.molfile, { inchikey: molecule&.inchikey }] if molecule
    end

    [Molecule.find_or_create_dummy, nil, {}]
  end

  # Returns [molecule, molfile_for_sample, babel_info]. When molfile has PolymersList/TextNode,
  # keeps full molfile and uses polymer find/create + SVG reprocess; otherwise sanitizes and finds by inchikey.
  def molecule_and_molfile_for_row(molfile)
    # rstrip, not strip: MOL line 1 (title) may legitimately be empty for Ketcher/ISIS molfiles; a
    # full strip deletes that blank line and shifts the CTAB up by one before PolymerMoleculeResolver
    # ever sees it (its normalize_for_open_babel only ever appends, per its own doc comment).
    raw = molfile.to_s.rstrip
    return [nil, nil, {}] if raw.blank?

    if Chemotion::MolfilePolymerSupport.has_polymer_content?(raw)
      result = Import::PolymerMoleculeResolver.call(raw, defer_pubchem_lookup: @defer_pubchem_lookup)
      [result.molecule, result.raw_molfile, result.babel_info]
    else
      san_molfile = sanitize_molfile(molfile)
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(san_molfile, render_svg: false)
      inchikey = babel_info[:inchikey]
      is_partial = babel_info[:is_partial]
      molecule = inchikey.present? ? Molecule.find_by(inchikey: inchikey, is_partial: is_partial) : nil
      [molecule, san_molfile, babel_info]
    end
  end

  def sanitize_molfile(mf)
    # TODO: check for residue polymer thingy
    mf.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace).scrub.split(/^(#{MOLFILE_BLOCK_END_LINE}(\r?\n)?)/).first.concat(MOLFILE_BLOCK_END_LINE)
  end
end
