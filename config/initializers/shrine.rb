require "shrine"
require "shrine/storage/file_system"
shrine_storage = Rails.application.config_for :shrine_config

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new(shrine_storage[:cache]), # temporary
  store: Shrine::Storage::FileSystem.new(shrine_storage[:store]) # permanent
}

Shrine.plugin :activerecord           # loads Active Record integration
Shrine.plugin :keep_files
Shrine.plugin :derivatives
Shrine.plugin :cached_attachment_data # enables retaining cached file across form redisplays
Shrine.plugin :restore_cached_data    # extracts metadata for assigned cached files
