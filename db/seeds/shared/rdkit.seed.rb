# frozen_string_literal: true

if Chemotion::Application.config.pg_cartridge == 'RDKit'
  mols = ActiveRecord::Base.connection.exec_query('select count(*) c from information_schema.tables
                                                    where table_schema = \'rdk\' AND table_name = \'mols\';')

  return unless mols[0]['c'].zero? # Nothing to do

  ActiveRecord::Base.connection.exec_query('create extension if not exists rdkit;')
  ActiveRecord::Base.connection.exec_query('create extension if not exists btree_gist;')
  ActiveRecord::Base.connection.exec_query('create schema if not exists rdk;')
  ActiveRecord::Base.connection.exec_query('select * into rdk.mols from
    (select id, mol_from_ctab(encode(molfile, \'escape\')::cstring) m from samples) tmp where m is not null;')
  ActiveRecord::Base.connection.exec_query('create index molidx on rdk.mols using gist(m);')
  ActiveRecord::Base.connection.exec_query('alter table rdk.mols add primary key (id);')
  ActiveRecord::Base.connection.exec_query('select id,torsionbv_fp(m) as torsionbv,morganbv_fp(m) as mfp2,
                                                    featmorganbv_fp(m) as ffp2 into rdk.fps from rdk.mols;')
  ActiveRecord::Base.connection.exec_query('create index fps_ttbv_idx on rdk.fps using gist(torsionbv);')
  ActiveRecord::Base.connection.exec_query('create index fps_mfp2_idx on rdk.fps using gist(mfp2);')
  ActiveRecord::Base.connection.exec_query('create index fps_ffp2_idx on rdk.fps using gist(ffp2);')
  ActiveRecord::Base.connection.exec_query('alter table rdk.fps add primary key (id);')
  ActiveRecord::Base.connection.exec_query(File.read('db/functions/set_samples_mol_rdkit_v01.sql'))
  ActiveRecord::Base.connection.exec_query(File.read('db/triggers/set_samples_mol_rdkit_trg_v01.sql'))
end
