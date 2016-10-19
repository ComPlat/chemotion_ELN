
class Import::ImportSdf

  attr_reader  :inchikeys, :collection_id, :current_user_id

  def initialize(args)
    @data = args[:data]||[]
    @message = {error: [], info:[]}
    @inchikeys = []
    @collection_id = args[:collection_id]
    @current_user_id = args[:current_user_id]
    @file_path = args[:file_path]

    read_data

    @count = @data.size
    if @count == 0
      @message[:error] << 'No Molecule found!'
    else
      @message[:info] << "This file contains #{@count} Molecules."
    end
  end

  def read_data
    if @file_path
      size = File.size(@file_path)
      if size.to_f < 200000000
        @data = File.readlines(@file_path,"$$$$\n")
      else
        @message[:error] << 'File too large (over 200MB)'
      end
    end
    @data
  end

  def message
    @message[:error].join("\n")+@message[:info].join("\n")
  end

  def status
    @message[:error].empty? && "ok" || "error"
  end

  def find_or_create_mol_by_batch(batch_size=50)
    n = batch_size - 1
    #return if @data.empty?
    data = @data
    while !data.empty?
      batch = data.slice!(0..n)
      molecules = Molecule.find_or_create_by_molfiles batch
      @inchikeys  += molecules.pluck(:inchikey)
    end
    count = @inchikeys.size
    @message[:info] << "#{count} Molecule#{count > 1 && "s" || ""} processed."

  end

  def create_samples
    ids = []
    samples = nil
    read_data if @data.empty?
    ActiveRecord::Base.transaction do
      @data.each do |molfile|
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
        inchikey = babel_info[:inchikey]
        unless inchikey.blank? || !(molecule = Molecule.where(inchikey: inchikey).first)
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
    @message[:error] << 'Could not create the samples!' if samples.empty?
    @message[:info] << "Created #{s} sample#{s == 1 || "" || "s"}" if samples
    @message[:info] << "Import successful!" if ids.size == @count
    samples
  end

end
