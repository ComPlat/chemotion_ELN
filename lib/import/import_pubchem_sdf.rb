
class Import::ImportPubchemSdf

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

  def find_or_create_pub_chem_mol_by_batch(batch_size=50)
    n = batch_size - 1
    #return if @data.empty?
    while !@data.empty?
      batch = @data.slice!(0..n)
      molecules = Molecule.find_or_create_by_molfiles batch
      @inchikeys  += molecules.pluck(:inchikey)
    end
    count = @inchikeys.size
    @message[:info] << "#{count} Molecule#{count > 1 && "s" || ""} processed."

  end



end
