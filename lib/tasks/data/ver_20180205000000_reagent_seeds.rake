namespace :data do
  desc 'Create molecules with molecule_name for standard reagents'
  task ver_20180205000000_reagent_seeds: :environment do
    reagent_seeds_path = File.join(Rails.root, 'db', 'reagent_seeds.sdf')
    reagent_array = File.read(reagent_seeds_path).split(/\$\$\$\$\n/)
    reagent_array.each_slice(30) do |slice|
      Molecule.find_or_create_by_molfiles(slice)
    end
    reagent_name_seeds_path = File.join(Rails.root, 'db', 'reagent_seeds.json')
    reagent_array = JSON.parse(File.read(reagent_name_seeds_path))
    reagent_array.each do |k,v|
      ik = Chemotion::OpenBabelService.smiles_to_inchikey(v.to_s)
      m = Molecule.find_by(inchikey: ik)
      next unless m
      iupac_name = MoleculeName.find_by(molecule_id: m.id, description: 'iupac_name', name: k)
      MoleculeName.create(molecule_id: m.id, description: 'iupac_name', name: k) unless iupac_name
    end
  end
end
