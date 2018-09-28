class AddRdkitExtension < ActiveRecord::Migration
  def self.up
    rdkit_extension = ActiveRecord::Base.connection.exec_query('select installed_version from pg_available_extensions where name = \'rdkit\' and installed_version is not null;')
    rdkit_extension.each do |row|
      # enable_extension 'rdkit' unless extension_enabled?('rdkit')
      execute 'alter table samples add column mol_rdkit mol;'
      execute 'create index index_samples_on_mol_rdkit on samples using gist(mol_rdkit);'
      execute 'update samples set mol_rdkit = mol_from_ctab(encode(molfile,\'escape\')::cstring);'
    end
  end

  def self.down
    execute 'alter table samples drop column if exists mol_rdkit;'
    # execute 'drop extension if exists rdkit;'
  end

end
