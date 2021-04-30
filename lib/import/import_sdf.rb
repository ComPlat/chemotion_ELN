# frozen_string_literal: true

class Import::ImportSdf
  attr_reader  :collection_id, :current_user_id, :processed_mol, :file_path,
               :inchi_array, :raw_data, :rows, :custom_data_keys, :mapped_keys

  SIZE_LIMIT = 40 # MB
  MOLFILE_BLOCK_END_LINE = 'M  END'

  def initialize(args)
    @raw_data = args[:raw_data] || []
    @message = { error: [], info: [] }
    @collection_id = args[:collection_id]
    @current_user_id = args[:current_user_id]
    @file_path = args[:file_path]
    @inchi_array = args[:inchikeys] || []
    @rows = args[:rows] || []
    @custom_data_keys = {}
    @mapped_keys = args[:mapped_keys] || {}
    read_data

    @count = @raw_data.empty? && @rows.size || @raw_data.size
    if @count.zero?
      @message[:error] << 'No Molecule found!'
    else
      @message[:info] << "This file contains #{@count} Molecules."
    end
  end

  def read_data
    if file_path
      size = File.size(file_path)
      if size.to_f < SIZE_LIMIT * 10**6
        @raw_data = File.binread(file_path).encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace).scrub.split(/\${4}\r?\n/)
      else
        @message[:error] << "File too large (over #{SIZE_LIMIT}MB). "
      end
    end
    @raw_data.pop if @raw_data[-1].blank?
    raw_data
  end

  def message
    @message[:error].join("\n") + @message[:info].join("\n")
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
            molecule_id: molecule.id
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
          rows.each do |row|
            next unless row

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
              sample[attrib] = row[attrib] if row[attrib].is_a?(Numeric) || row[attrib] && !row[attrib].empty?
            end
            properties = process_molfile_opt_data(molfile)
            sample.validate_stereo('abs' => properties['STEREO_ABS'], 'rel' => properties['STEREO_REL'])

            sample.target_amount_value = properties['TARGET_AMOUNT'] unless properties['TARGET_AMOUNT'].blank?
            sample.target_amount_unit = properties['TARGET_UNIT'] unless properties['TARGET_UNIT'].blank?
            sample.real_amount_value = properties['REAL_AMOUNT'] unless properties['REAL_AMOUNT'].blank?
            sample.real_amount_unit = properties['REAL_UNIT'] unless properties['REAL_UNIT'].blank?

            sample.collections << Collection.find(collection_id)
            sample.collections << Collection.get_all_collection_for_user(current_user_id)
            sample.save!
            ids << sample.id
          end
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
    custom_data = mf.scan(/^\>[^\n]*\<(\S+)\>[^\n]*[\n]*([^>]*)/m)
    Hash[custom_data.map do |key, value|
      k = key.to_s.strip.upcase.gsub(/\s/, '_')
      @custom_data_keys[k] = true
      [k, value.strip]
    end]
  end

  def sanitize_molfile(mf)
#TODO check for residue polymer thingy
    mf.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace).scrub.split(/^(#{MOLFILE_BLOCK_END_LINE}(\r?\n)?)/).first.concat(MOLFILE_BLOCK_END_LINE)

  end
end
