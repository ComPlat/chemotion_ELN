class CreateFunctionSetSamplesMolRdkit < ActiveRecord::Migration
  def change
    rdkit_extension = ActiveRecord::Base.connection.exec_query('select installed_version from pg_available_extensions where name = \'rdkit\' and installed_version is not null;')
    rdkit_extension.each do |row|
      create_function :set_samples_mol_rdkit
    end
  end
end
