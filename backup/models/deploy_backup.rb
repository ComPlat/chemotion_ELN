# This code defines 2 backup models: 'deploy_backup' and 'weekly_backup'

%i(deploy_backup weekly_backup).each do |backup_name|
  Backup::Model.new(backup_name, 'Description for psql_deploy') do

    config = Rails.configuration.database_configuration[Rails.env]

    archive :attachments_backup do |archive|
      archive.add File.readlink("#{Rails.root}/public/images")
      # archive.add File.readlink("#{Rails.root}/public/images/molecules")
      # archive.add File.readlink("#{Rails.root}/public/images/reactions")
      # archive.add File.readlink("#{Rails.root}/public/images/research_plans")
      # archive.add File.readlink("#{Rails.root}/public/images/samples")
      # archive.add File.readlink("#{Rails.root}/public/images/sprites")
      # archive.add File.readlink("#{Rails.root}/public/images/templates")
      archive.add File.readlink("#{Rails.root}/public/docx")
      archive.add File.readlink("#{Rails.root}/tmp/uploads")
      archive.add File.readlink("#{Rails.root}/uploads")     
      archive.add File.readlink("#{Rails.root}/uploadNew")
    end

    database PostgreSQL do |db|
      # To dump all databases, set `db.name = :all` (or leave blank)
      db.name               = config['database']
      db.username           = config['username']
      db.password           = config['password']
      db.host               = config['host']
      db.port               = config['port'] || 5432
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
end
