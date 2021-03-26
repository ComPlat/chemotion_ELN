
class Molecule < ActiveRecord::Base
  self.inheritance_column = nil
end

class MoleculeName < ActiveRecord::Base
  self.inheritance_column = nil
end

class ElementTag < ActiveRecord::Base
  self.inheritance_column = nil
end

seed_mols_path = File.join(Rails.root, 'db', 'seeds', 'json', 'seed_molecules.json')
seed_mol_svgs_path = File.join(Rails.root, 'db', 'seeds', 'data', 'molecules_svg.zip')
mol_svgs_path = File.join(Rails.root, 'public', 'images', 'molecules')

mol_array = JSON.parse(File.read(seed_mols_path))

mol_array.each do |mol|
  next unless Molecule.find_by(inchikey: mol['inchikey']).nil?

  molecule = Molecule.create(
    inchikey: mol['inchikey'],
    inchistring: mol['inchistring'],
    density: mol['density'],
    molecular_weight: mol['molecular_weight'],
    molfile: mol['molfile'],
    sum_formular: mol['sum_formular'],
    names: mol['names'],
    iupac_name: mol['iupac_name'],
    molecule_svg_file: mol['molecule_svg_file'],
    exact_molecular_weight: mol['exact_molecular_weight'],
    cano_smiles: mol['cano_smiles'],
    molfile_version: mol['molfile_version']
  )

  ElementTag.create(
    taggable_type: 'Molecule',
    taggable_id: molecule.id,
    taggable_data: mol['tag']
  )

  mol['molecule_names']&.each do |mn|
    MoleculeName.create(
      molecule_id: molecule.id,
      description: mn['description'],
      name: mn['name']
    )
  end
end

Zip::File.open(seed_mol_svgs_path) do |zip_file|
  zip_file.each do |entry|
    pub_path = File.join(mol_svgs_path, entry.name)
    zip_file.extract(entry, pub_path) unless File.exist?(pub_path)
  end
end
