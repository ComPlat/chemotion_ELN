require "shrine"
require "shrine/storage/file_system"

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new("uploads", prefix: "shrine/cache"), # temporary
  store: Shrine::Storage::FileSystem.new("uploads", prefix: "shrine"),       # permanent
}

Shrine.plugin :activerecord           # loads Active Record integration
Shrine.plugin :derivatives
Shrine.plugin :cached_attachment_data # enables retaining cached file across form redisplays
Shrine.plugin :restore_cached_data    # extracts metadata for assigned cached files
