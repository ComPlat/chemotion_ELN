# frozen_string_literal: true

if Chemotion::Application.config.pg_cartridge == 'rdkit'
  mols = ActiveRecord::Base.connection.exec_query("select count(*) c from information_schema.tables
                                                    where table_schema = 'rdkit' AND table_name = 'mols';")
  return unless mols[0]['c'].zero? # Nothing to do

  [20240808125800, 20240808125801, 20240808125802].each do |migration_stamp|
    ActiveRecord::MigrationContext.new(
      'db/migrate',
      ActiveRecord::Base.connection.schema_migration,
    ).run(:down, migration_stamp)
    ActiveRecord::MigrationContext.new(
      'db/migrate',
      ActiveRecord::Base.connection.schema_migration,
    ).run(:up, migration_stamp)
  end
end
