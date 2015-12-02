require 'roo'
module ImportSamples
  extend ActiveSupport::Concern

  module ClassMethods

    def import_samples_from_file(file_path)
      xlsx = Roo::Spreadsheet.open(file_path)
      rows = xlsx.parse(name: "Name", description: "Beschreibung", smiles: "Smiles")
      rows.shift
      rows.map do |row|
        molfile = Chemotion::PubchemService.molfile_from_smiles URI::encode(row[:smiles], '[]/()+-.@#=\\')
        molecule = Molecule.find_or_create_by_molfile(molfile)
        Sample.create(name: row[:name], description: row[:description], molecule: molecule)
      end
    end
  end

end