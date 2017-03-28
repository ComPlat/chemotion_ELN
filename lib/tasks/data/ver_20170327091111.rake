namespace :data do
  desc "data modifications for 20170327091111_add_cas_to_molecules_samples"
  task ver_20170327091111: :environment do
    Molecule.all.each do |molecule|
      next if molecule.cas && molecule.cas.length > 0
      next if !molecule.inchikey
      xref = Chemotion::PubchemService.xref_from_inchikey(molecule.inchikey)
      molecule.cas = Molecule.get_cas xref
      molecule.save!
    end
  end
end
