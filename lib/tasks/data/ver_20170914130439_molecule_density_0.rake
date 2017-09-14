namespace :data do
  desc 'Add default density 0 to every molecule'
  task ver_20170914130439_molecule_density_0: :environment do
    Molecule.find_each do |m|
      m.update_columns(density: 0) if m.density.blank?
    end
  end
end
