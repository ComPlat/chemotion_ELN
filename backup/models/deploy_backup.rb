##
# Backup Generated: psql_deploy
# Once configured, you can run the backup with the following command:
#
# $ backup perform -t psql_deploy [-c <path_to_configuration_file>]
#
Backup::Model.new(:deploy_backup, 'Description for psql_deploy') do

  config = Rails.configuration.database_configuration[Rails.env]

  archive :attachments_backup do |archive|
    archive.add "#{Rails.root}/public/images/molecules"
    archive.add "#{Rails.root}/public/images/reactions"
    archive.add "#{Rails.root}/public/images/samples"
    archive.add "#{Rails.root}/uploads/attachments"
  end

  database PostgreSQL do |db|
    # To dump all databases, set `db.name = :all` (or leave blank)
    db.name               = config['database']
    db.username           = config['username']
    db.password           = config['password']
    db.host               = config['host']
    db.port               = 5432
  end

  ##
  # Local (Copy) [Storage]
  #
  store_with Local do |local|
    local.path       = "backup/"
    local.keep       = 5
  end

  ##
  # Gzip [Compressor]
  #
  compress_with Gzip

end
