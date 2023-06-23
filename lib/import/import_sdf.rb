# frozen_string_literal: true

require 'charlock_holmes'

class Import::ImportSdf < Import::ImportSamples
  attr_reader  :collection_id, :current_user_id, :processed_mol, :file_path,
               :inchi_array, :raw_data, :rows, :custom_data_keys, :mapped_keys, :unprocessable_samples

  SIZE_LIMIT = 40 # MB
  MOLFILE_BLOCK_END_LINE = 'M  END'

  def initialize(args)
    @raw_data = args[:raw_data] || []
    @message = { error: [], info: [], error_messages: [] }
    @collection_id = args[:collection_id]
    @current_user_id = args[:current_user_id]
    @file_path = args[:file_path]
    @inchi_array = args[:inchikeys] || []
    @rows = args[:rows] || []
    @custom_data_keys = {}
    @mapped_keys = keys_to_map || {}
    @unprocessable_samples = []
    read_data

    @count = @raw_data.empty? && @rows.size || @raw_data.size
    if @count.zero?
      @message[:error] << 'No Molecule found!'
    else
      @message[:info] << "This file contains #{@count} Molecules."
    end
  end

  def keys_to_map
    {
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
    }
  end

  def read_data
    if file_path
      size = File.size(file_path)
      if size.to_f < SIZE_LIMIT * 10**6
        file_data = File.read(file_path)
        detection = CharlockHolmes::EncodingDetector.detect(file_data)
        encoded_file = CharlockHolmes::Converter.convert file_data, detection[:encoding], 'UTF-8'
        @raw_data = encoded_file.split(/\${4}\r?\n/)
      else
        @message[:error] << "File too large (over #{SIZE_LIMIT}MB). "
      end
    end
    @raw_data.pop if @raw_data[-1].blank?
    raw_data
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
    @message[:error].empty? && 'ok' || 'error'
  end

  def find_or_create_mol_by_batch(batch_size = 50)
    n = batch_size - 1
    inchikeys = []
    @processed_mol = []
    data = raw_data.dup
    until data.empty?
      batch = data.slice!(0..n)
      molecules = find_or_create_by_molfiles(batch)
      inchikeys += molecules.map { |m| m && m[:inchikey] || nil }
      @processed_mol += molecules
    end

    count = inchikeys.compact.size
    if count.positive?
      @message[:info] << "#{count} Molecule#{count > 1 && 's' || ''} processed. "
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
            san_molfile = sanitize_molfile(molfile)
            babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(san_molfile)
            inchikey = babel_info[:inchikey]
            is_partial = babel_info[:is_partial]
            next unless inchikey.presence && (molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial))

            sample = Sample.new(
              created_by: current_user_id,
              molfile: san_molfile,
              molfile_version: babel_info[:molfile_version],
              molecule_id: molecule.id
            )

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
            sample['density'] = row['density'] if row['density'].present?
            sample['name'] = row['name'] if row['name'].present?
            sample['xref']['cas'] = row['cas'] if row['cas'].present?
            sample['short_label'] = row['short_label'] if row['short_label'].present?
            sample['molarity_value'] = row['molarity']&.scan(/\d+\.*\d*/)[0] if row['molarity'].present?
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
            ids << sample.id
          rescue StandardError => _e
            @unprocessable_samples << (i + 1)
          end
          unless @unprocessable_samples.empty?
            error_messages = "Following samples could not be imported #{@unprocessable_samples}."
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
    samples
  end

  def find_or_create_by_molfiles(molfiles)
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles)

    babel_info_array.map.with_index do |babel_info, i|
      if babel_info[:inchikey].present?
        mf = molfiles[i]
        m = Molecule.find_or_create_by_molfile(mf, babel_info)
        process_molfile_opt_data(mf).merge(
          inchikey: m.inchikey, svg: "molecules/#{m.molecule_svg_file}", name: m.iupac_name, molfile: mf
        )
      else
        { name: nil, inchikey: nil, svg: 'no_image_180.svg' }
      end
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

  def sanitize_molfile(mf)
    # TODO: check for residue polymer thingy
    mf.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace).scrub.split(/^(#{MOLFILE_BLOCK_END_LINE}(\r?\n)?)/).first.concat(MOLFILE_BLOCK_END_LINE)
  end
end
