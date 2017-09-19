namespace :data do
  desc 'create molecule_name'
  task ver_20170906105933_molecule_name: :environment do
    Molecule.find_each(&:create_molecule_names)

    Sample.with_deleted.find_each do |s|
      m = s.molecule
      mns = m.molecule_names
      origin = m.iupac_name || m.sum_formular
      if origin && mns.present?
        mn = mns.where(name: origin).first
        s.update_columns(molecule_name_id: mn.id) if mn
      else
        Rails.logger.warn(
          "Warning: No molecule_names for Sample id #{s.id}"
        )
      end
    end
  end
end
