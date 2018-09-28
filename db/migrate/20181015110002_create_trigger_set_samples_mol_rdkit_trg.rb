class CreateTriggerSetSamplesMolRdkitTrg < ActiveRecord::Migration
  def change
    rdkit_extension = ActiveRecord::Base.connection.exec_query('select installed_version from pg_available_extensions where name = \'rdkit\' and installed_version is not null;')
    rdkit_extension.each do |row|
      create_trigger :set_samples_mol_rdkit_trg, on: :samples
    end
  end
end
