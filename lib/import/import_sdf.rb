# frozen_string_literal: true

require 'charlock_holmes'
require Rails.root.join('lib/chemotion/molfile_polymer_support')

class Import::ImportSdf < Import::ImportSamples
  attr_reader  :collection_id, :current_user_id, :processed_mol, :import_type,
               :inchi_array, :raw_data, :rows, :custom_data_keys, :mapped_keys, :unprocessable_samples

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
        @raw_data = encoded_file.split(/\${4}\r?\n/)
      else
        @message[:error] << "File too large (over #{SIZE_LIMIT}MB). "
      end
    rescue StandardError => e
      @message[:error] << "Failed to read attachment file: #{e.message}"
    end
    @raw_data.pop if @raw_data[-1].blank?
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
    n = batch_size - 1
    inchikeys = []
    @processed_mol = []
    data = raw_data.dup
    until data.empty?
      batch = data.slice!(0..n)
      molecules = find_or_create_by_molfiles(batch)
      inchikeys += molecules.map { |m| (m && m[:inchikey]) || nil }
      @processed_mol += molecules
    end

    count = inchikeys.compact.size
    if count.positive?
      @message[:info] << "#{count} Molecule#{(count > 1 && 's') || ''} processed. "
    else
      @message[:error] << 'No Molecule processed. '
    end
    @inchi_array += inchikeys.compact
  end

  def is_number?(string)
    true if Float(string)
  rescue StandardError
    false
  end

  def create_samples
    ids = []
    read_data if raw_data.empty? && rows.empty?
    if !raw_data.empty? && inchi_array.empty?
      ActiveRecord::Base.transaction do
        raw_data.each do |molfile|
          babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
          inchikey = babel_info[:inchikey]
          is_partial = babel_info[:is_partial]
          next unless inchikey.presence && (molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial))
          next unless (i = inchi_array.index(inchikey))

          @inchi_array[i] = nil
          sample = Sample.new(
            created_by: current_user_id,
            molfile: molfile,
            molfile_version: babel_info[:molfile_version],
            molecule_id: molecule.id,
          )
          sample.collections << Collection.find(collection_id)
          sample.collections << Collection.get_all_collection_for_user(current_user_id)
          sample.save!
          ids << sample.id
        end
      end
    elsif !rows.empty?
      begin
        ActiveRecord::Base.transaction do
          attribs = Sample.attribute_names & @mapped_keys.keys
          error_messages = []
          rows.each_with_index do |row, i|
            next unless row

            error_columns = ''
            molfile = row['molfile']
            molecule, molfile_for_sample, babel_info = resolve_molecule_for_row(row)
            next if molecule.blank?

            inchikey = babel_info[:inchikey]
            sample = Sample.new(
              created_by: current_user_id,
              molfile: molfile_for_sample,
              molfile_version: babel_info[:molfile_version],
              molecule_id: molecule.id,
            )
            sample.decoupled = true if molfile_for_sample.nil?
            sample.inventory_sample = true if @import_type == 'chemical'

            attribs.each do |attrib|
              sample[attrib] = row[attrib] if is_number?(row[attrib])
            end
            if row['molecule_name'].present?
              molecule_name = molecule.create_molecule_name_by_user(row['molecule_name'], current_user_id)
              sample['molecule_name_id'] = molecule_name.id unless molecule_name.blank?
            end
            sample['melting_point'] = format_to_interval_syntax(row['melting_point']) if row['melting_point'].present?
            sample['boiling_point'] = format_to_interval_syntax(row['boiling_point']) if row['boiling_point'].present?
            sample['solvent'] = handle_sample_solvent_column(sample, row) if row['solvent'].present?

            sample['description'] = row['description'] if row['description'].present?
            sample['location'] = row['location'] if row['location'].present?
            sample['external_label'] = row['external_label'] if row['external_label'].present?
            sample['name'] = row['name'] if row['name'].present?
            sample['xref']['cas'] = row['cas'] if row['cas'].present?
            sample['short_label'] = row['short_label'] if row['short_label'].present?
            sample['dry_solvent'] = row['dry_solvent'] if row['dry_solvent'].present?
            sample['purity'] = row['purity'] if row['purity'].present?
            sample['density'] = row['density'].to_f if row['density'].present? && row['density'].match?(DENSITY_UNIT)
            sample['xref']['refractive_index'] = row['refractive_index'] if row['refractive_index'].present?
            sample['xref']['form'] = row['form'] if row['form'].present?
            sample['xref']['color'] = row['color'] if row['color'].present?
            sample['xref']['solubility'] = row['solubility'] if row['solubility'].present?
            sample['xref']['inventory_label'] = row['inventory_label'] if row['inventory_label'].present?
            if row['flash_point'].present?
              flash_point = to_value_unit_format(row['flash_point'], 'flash_point')
              handle_flash_point(sample, flash_point)
            end
            if row['molarity'].present? && row['molarity'].match?(MOLARITY_UNIT) && row['density'].blank?
              molarity = to_value_unit_format(row['molarity'], 'molarity')
              handle_molarity(sample, molarity)
            end
            properties = process_molfile_opt_data(molfile)
            sample.validate_stereo('abs' => properties['STEREO_ABS'], 'rel' => properties['STEREO_REL'])
            sample.target_amount_value = properties['TARGET_AMOUNT'] unless properties['TARGET_AMOUNT'].blank?
            sample.target_amount_unit = properties['TARGET_UNIT'] unless properties['TARGET_UNIT'].blank?
            if row['target_amount'].present? && row['target_amount_unit'].blank?
              target_amount_data = row['target_amount']&.split('/')[0] || ''
              target_amount = target_amount_data&.scan(/\d+|\D+/)
              sample.target_amount_value = 0
              sample.target_amount_unit = 'g'
              if target_amount.length == 2
                target_amount[1] = target_amount[1].gsub(/\A\p{Space}*|\p{Space}*\z/, '')
                if is_number?(target_amount[0]) && %w[g mg l ml mol].include?(target_amount[1])
                  sample.target_amount_value = target_amount[0]
                  sample.target_amount_unit = target_amount[1]
                else
                  error_columns += ' target amount, target amount unit ,'
                end
              else
                error_columns += ' target amount, target amount unit ,'
              end
            end
            sample.real_amount_value = properties['REAL_AMOUNT'] unless properties['REAL_AMOUNT'].blank?
            sample.real_amount_unit = properties['REAL_UNIT'] unless properties['REAL_UNIT'].blank?
            if row['real_amount'].present? && row['real_amount_unit'].blank?
              real_amount_data = row['real_amount']&.split('/')[0] || ''
              real_amount = real_amount_data&.scan(/\d+|\D+/)
              sample.real_amount_value = 0
              sample.real_amount_unit = 'g'
              if real_amount.length == 2
                real_amount[1] = real_amount[1].gsub(/\A\p{Space}*|\p{Space}*\z/, '')
                if is_number?(real_amount[0]) && %w[g mg l ml mol].include?(real_amount[1])
                  sample.real_amount_value = real_amount[0]
                  sample.real_amount_unit = real_amount[1]
                else
                  error_columns += ' real amount, real amount unit ,'
                end
              else
                error_columns += ' target amount, target amount unit ,'
              end
            end

            error_messages << "The columns#{error_columns} of sample #{molecule['iupac_name']} cannot be processed." if error_columns.present?
            sample.collections << Collection.find(collection_id)
            sample.collections << Collection.get_all_collection_for_user(current_user_id)
            sample.save!
            save_chemical_for_row(sample, row) if @import_type == 'chemical'
            ids << sample.id
          rescue StandardError => e
            Rails.logger.error("SDF import: row #{i + 1} could not be imported: #{e.class}: #{e.message}")
            @unprocessable_samples << (i + 1)
            error_messages << "Sample #{i + 1} could not be imported: #{e.message}"
          end
          if error_messages.empty? && @unprocessable_samples.any?
            error_messages << "Following samples could not be imported #{@unprocessable_samples}."
          end
          @message[:error_messages] = error_messages if error_messages.present?
        end
      rescue ActiveRecord::RecordInvalid => e
        @message[:error] << e
      end
    else
      @message[:error] << 'No sample selected. '
    end

    ids.compact!
    samples = Sample.where('id IN (?)', ids)
    s = ids.size
    @message[:error] << 'Could not create the samples! ' if samples.empty?
    @message[:info] << "Created #{s} sample#{s <= 1 && '' || 's'}. " if samples
    @message[:info] << 'Import successful! ' if ids.size == @count

    # Clean up attachment if import was successful
    @attachment.destroy if @message[:error].empty? && @attachment.present?

    samples
  end

  # Build a Chemical from the mapped row fields (cas, status, person, pictograms, h/p statements, ...)
  # and link it to the freshly-created inventory sample. Mirrors the XLSX chemical import path.
  def save_chemical_for_row(sample, row)
    chemical = Import::ImportChemicals.build_chemical(row, row.keys)
    chemical.sample_id = sample.id
    chemical.save!
  end

  def find_or_create_by_molfiles(molfiles)
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles)

    babel_info_array.map.with_index do |babel_info, i|
      mf = molfiles[i]
      if Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(mf.to_s)
        find_or_create_polymer_molfile_entry(mf.to_s.strip, babel_info)
      elsif babel_info[:inchikey].present?
        molfile_entry_with_inchikey(mf, babel_info)
      else
        molfile_entry_without_inchikey(mf)
      end
    end
  end

  # Build a preview entry for a molfile whose structure resolved to an inchikey.
  def molfile_entry_with_inchikey(molfile, babel_info)
    molecule = Molecule.find_or_create_by_molfile(molfile, babel_info)
    process_molfile_opt_data(molfile).merge(
      inchikey: molecule.inchikey,
      svg: "molecules/#{molecule.molecule_svg_file}",
      name: molecule.iupac_name,
      molfile: molfile,
    )
  end

  # Build a preview entry when no structure resolved: try CAS lookup, else mark the entry decoupled.
  def molfile_entry_without_inchikey(molfile)
    props = process_molfile_opt_data(molfile)
    cas_nr = props['CAS'].to_s.strip
    molecule = cas_nr.match?(/^\d+-\d+-\d+$/) ? find_molecule_by_cas(cas_nr) : nil
    return props.merge(name: nil, inchikey: nil, svg: 'no_image_180.svg', decoupled: true) unless molecule

    props.merge(
      inchikey: molecule.inchikey,
      svg: "molecules/#{molecule.molecule_svg_file}",
      name: molecule.iupac_name,
      molfile: molecule.molfile,
    )
  end

  # When molfile has PolymersList/TextNode: keep full molfile, clean for babel, find/create molecule, reprocess SVG.
  def find_or_create_polymer_molfile_entry(raw_molfile, _babel_info_from_batch)
    raw_molfile = unescape_textnode_octal_in_molfile(raw_molfile)
    cleaned = clean_molfile_for_inchikey(raw_molfile)
    return { name: nil, inchikey: nil, svg: 'no_image_180.svg' } if cleaned.blank?

    molfile_for_babel = cleaned.dup
    molfile_for_babel = "\n#{molfile_for_babel}" unless molfile_for_babel.start_with?("\n")
    molfile_for_babel = "#{molfile_for_babel}\n" unless molfile_for_babel.end_with?("\n")
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile_for_babel)

    molecule = if babel_info[:inchikey].present?
                 Molecule.find_or_create_by_molfile(raw_molfile, babel_info)
               else
                 find_or_create_polymer_molecule_without_inchikey(raw_molfile, babel_info)
               end

    if molecule.present?
      reprocessed_svg = Molecule.svg_reprocess(nil, raw_molfile, service: :indigo)
      if reprocessed_svg.present?
        molecule.attach_svg(reprocessed_svg)
        molecule.molfile = raw_molfile if molecule.molfile.to_s != raw_molfile
        molecule.save
      end
      process_molfile_opt_data(raw_molfile).merge(
        inchikey: molecule.inchikey,
        svg: "molecules/#{molecule.molecule_svg_file}",
        name: molecule.iupac_name,
        molfile: raw_molfile,
      )
    else
      { name: nil, inchikey: nil, svg: 'no_image_180.svg' }
    end
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
    raw = molfile.to_s.strip
    return [nil, nil, {}] if raw.blank?

    if Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(raw)
      raw = unescape_textnode_octal_in_molfile(raw)
      cleaned = Chemotion::MolfilePolymerSupport.clean_molfile_for_inchikey(raw)
      return [nil, nil, nil] if cleaned.blank?

      molfile_for_babel = cleaned.dup
      molfile_for_babel = "\n#{molfile_for_babel}" unless molfile_for_babel.start_with?("\n")
      molfile_for_babel = "#{molfile_for_babel}\n" unless molfile_for_babel.end_with?("\n")
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile_for_babel)
      molecule = if babel_info[:inchikey].present?
                   Molecule.find_or_create_by_molfile(raw, babel_info)
                 else
                   find_or_create_polymer_molecule_without_inchikey(raw, babel_info)
                 end
      if molecule.present?
        reprocessed_svg = Molecule.svg_reprocess(nil, raw, service: :indigo)
        if reprocessed_svg.present?
          molecule.attach_svg(reprocessed_svg)
          molecule.molfile = raw if molecule.molfile.to_s != raw
          molecule.save
        end
      end
      [molecule, raw, babel_info]
    else
      san_molfile = sanitize_molfile(molfile)
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(san_molfile)
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
