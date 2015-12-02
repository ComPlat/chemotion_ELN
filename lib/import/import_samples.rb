require 'roo'
class Import::ImportSamples

  def self.import_samples_from_file(file_path, collection_id)
    xlsx = Roo::Spreadsheet.open(file_path)
    rows = xlsx.parse(name: "Name", description: "Beschreibung", smiles: "Smiles")
    rows.shift
    rows.map do |row|
      molfile = Chemotion::PubchemService.molfile_from_smiles URI::encode(row[:smiles], '[]/()+-.@#=\\')
      molecule = Molecule.find_or_create_by_molfile(molfile)
      sample = Sample.create(name: row[:name], description: row[:description], molecule: molecule)
      CollectionsSample.create(collection_id: collection_id, sample_id: sample.id)
    end
  end

end
