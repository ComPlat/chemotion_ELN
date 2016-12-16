
class Import::ImportSdf

  attr_reader  :collection_id, :current_user_id, :processed_mol, :file_path,
   :inchi_array, :raw_data

  SIZE_LIMIT = 40 #MB

  def initialize(args)
    @raw_data = args[:raw_data]||[]
    @message = {error: [], info:[]}
    @collection_id = args[:collection_id]
    @current_user_id = args[:current_user_id]
    @file_path = args[:file_path]
    @inchi_array = args[:inchikeys]
    read_data
    @count = @raw_data.size
    if @count == 0
      @message[:error] << 'No Molecule found!'
    else
      @message[:info] << "This file contains #{@count} Molecules."
    end
  end

  def read_data
    if file_path
      size = File.size(file_path)
      if size.to_f < SIZE_LIMIT*10**6
        @raw_data = File.readlines(file_path,"$$$$\n")
      else
        @message[:error] << "File too large (over #{SIZE_LIMIT}MB). "
      end
    end
    @raw_data.pop if @raw_data[-1].blank?
    raw_data
  end

  def message
    @message[:error].join("\n")+@message[:info].join("\n")
  end

  def status
    @message[:error].empty? && "ok" || "error"
  end

  def find_or_create_mol_by_batch(batch_size=50)
    n = batch_size - 1
    inchikeys=[]
    @processed_mol=[]
    data = raw_data.dup
    while !data.empty?
      batch = data.slice!(0..n)
      molecules = find_or_create_by_molfiles batch , false, false
      inchikeys  += molecules.map{|m| m && m[:inchikey] || nil }
      @processed_mol += molecules
    end

    count = inchikeys.compact.size
    if count > 0
      @message[:info] << "#{count} Molecule#{count > 1 && "s" || ""} processed. "
    else
      @message[:error] << "No Molecule processed. "
    end
  end

  def create_samples
    ids = []
    read_data if raw_data.empty?

    ActiveRecord::Base.transaction do
      raw_data.each do |molfile|
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(Molecule.skip_residues(molfile))
        inchikey = babel_info[:inchikey]
        unless inchikey.blank? || !(molecule = Molecule.where(inchikey: inchikey).first)
          next unless i=inchi_array.index(inchikey)
          @inchi_array[i]=nil
          sample = Sample.new(created_by: current_user_id)
          sample.molfile = molfile
          sample.molecule = molecule
          sample.collections << Collection.find(collection_id)
          sample.collections << Collection.get_all_collection_for_user(current_user_id)
          sample.save!
          ids << sample.id
        end
      end
    end
    ids.compact!
    samples = Sample.where('id IN (?)',ids)
    s = ids.size
    @message[:error] << 'Could not create the samples! ' if samples.empty?
    @message[:info] << "Created #{s} sample#{s <= 1 && "" || "s"}. " if samples
    @message[:info] << "Import successful! " if ids.size == @count
    samples
  end

  def find_or_create_by_molfiles molfiles, is_partial = false, is_compact = true

    bi = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles)
    inchikeys = bi.map do |babel_info|
      inchikey = babel_info[:inchikey]
      !inchikey.blank? && inchikey || nil
    end

    compact_iks = inchikeys.compact
    mol_to_get = []

    iks = inchikeys.dup
    unless compact_iks.empty?
      existing_ik = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey)
      mol_to_get = compact_iks - existing_ik
    end
    unless mol_to_get.empty?
      pi = Chemotion::PubchemService.molecule_info_from_inchikeys(mol_to_get)
      pi.each do |pubchem_info|
        ik = pubchem_info[:inchikey]
        Molecule.find_or_create_by(inchikey: ik,
          is_partial: is_partial) do |molecule|
          i =  iks.index(ik)
          iks[i] = nil
          babel_info = bi[i]
          molecule.molfile = molfiles[i]
          molecule.assign_molecule_data babel_info, pubchem_info
        end
      end
    end

    iks = inchikeys.dup
    unless compact_iks.empty?
      existing_ik = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey)
      mol_to_get = compact_iks - existing_ik
    end
    unless mol_to_get.empty?
      mol_to_get.each do |ik|
        Molecule.find_or_create_by(inchikey: ik,
          is_partial: is_partial) do |molecule|
          i =  iks.index(ik)
          iks[i] = nil
          babel_info = bi[i]
          molecule.molfile = molfiles[i]
          molecule.assign_molecule_data babel_info
        end
      end
    end

    molecules = Molecule.where('inchikey IN (?)',compact_iks).pluck(:inchikey,:molecule_svg_file,:iupac_name)
    iks = inchikeys.dup
    mol_array = Array.new(iks.size){ {name: nil,inchikey: nil ,svg: nil} }
    molecules.each do |mol|

      i = iks.index(mol[0])
      if i
        iks[i] = nil
        mol_array[i]={name: mol[2],inchikey: mol[0],svg: mol[1]}
      end
    end
    mol_array
  end

end
