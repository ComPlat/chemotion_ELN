require 'roo'
class Import::ImportSamples

  def self.import_samples_from_file(file_path, collection_id, current_user_id)

    begin
      xlsx = Roo::Spreadsheet.open(file_path)
    rescue
      return {status: "invalid", message: "Can not process this type of file", data: []}
    end
    begin
      rows = xlsx.parse(name: /^\s*names?/i, description: /^\s*descriptions?/i, smiles: /^\s*smiles?/i, value: /^\s*values?/i)
    rescue
      return {status: "invalid", message: "Column headers should have: Name, Description, Smiles, and Value", data: []}
    end
    #desc: openebabel checks if valid smiles are present
    rows.shift
    p rows
    unprocessable = rows.select.with_index do |row,i|
      canon_smiles = Chemotion::OpenBabelService.smiles_to_canon_smiles row[:smiles].to_s
      canon_smiles.blank? && row[:id]= i+2
    end

    if !unprocessable.empty?
      message = unprocessable.map{|e| "at line #{e[:id]}:#{e[:name]} "} .join("\n")
      {status: "failed", data: unprocessable, message: message}
    else
      processed =[]
      all_collection = Collection.get_all_collection_for_user(current_user_id)
      begin
      ActiveRecord::Base.transaction do
        processed = rows.map.with_index do |row,i|
          molfile = Chemotion::PubchemService.molfile_from_smiles row[:smiles]
          molecule = Molecule.find_or_create_by_molfile(molfile)
          if molecule.nil?
            row[:id]=i+2
            processed = [row]
            raise "Import of Sample #{row[:name]}: Molecule is nil."
          end
          sample = Sample.create(name: row[:name], description: row[:description], molecule: molecule, imported_readout: row[:value], created_by: current_user_id)
          CollectionsSample.create(collection_id: collection_id, sample_id: sample.id)
          CollectionsSample.create(collection_id: all_collection.id, sample_id: sample.id)
        end
      end
      {status: "ok", data: processed, message: ""}
      rescue
      {status: "error", data: processed, message: processed.map{|e| "at line #{e[:id]}:#{e[:name]} "}.join("\n")}
      end

    end
  end

end
