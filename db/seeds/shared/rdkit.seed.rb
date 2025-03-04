# frozen_string_literal: true
#
pg_cartridge = Chemotion::Application.config.pg_cartridge

# function: output log message 
output_log_message = lambda do |message|
  puts "INFO : pg_cartrige set to '#{pg_cartridge}': #{message}"
  Rails.logger.info(message)
end

schema_table_exists = lambda do |schema, table|
  ActiveRecord::Base.connection.exec_query(
    "select count(*) c from information_schema.tables where table_schema = '#{schema}' AND table_name = '#{table}';"
  )[0]['c'].positive?
 
end

extension_installed = lambda do |name|
  ActiveRecord::Base.connection.execute(
    "SELECT * FROM pg_extension WHERE extname = '#{name}' "
  ).count.positive?
end

info_messages = {
  init: 'pg structure search cartridge - checking whether to (re)run migrations and create the search table',
  pg_cartridge_not_set: 'cartridge is not set - skipping migrations',
  pg_cartridge_set: 'cartridge is set and pg_extension is available - checking whether to (re)run migrations',
  extension_not_installed: 'extension is not installed - (re)run migrations',
  schema_table_not_exists: 'search schema table does not exist - (re)run migrations',
  feature_ready: 'RDKit schema table exists - skipping migrations',
}

# initial message
output_log_message.call(info_messages[:init])

# if pg_cartridge is set then the pg_extension is at least available
if pg_cartridge == 'none'
  output_log_message.call(info_messages[:pg_cartridge_not_set])
  return
end

extension_ready = extension_installed.call(pg_cartridge)
schema_ready = schema_table_exists.call(pg_cartridge, 'mols')

case 
when !extension_ready 
  output_log_message.call(info_messages[:extension_not_installed])
when !schema_ready
  output_log_message.call(info_messages[:schema_table_not_exists])
else
  output_log_message.call(info_messages[:feature_ready])
  return
end


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
