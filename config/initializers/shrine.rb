require "shrine"
require "shrine/storage/file_system"
shrine_storage = Rails.application.config_for :shrine

Rails.application.configure do
  config.shrine_storage = ActiveSupport::OrderedOptions.new
  config.shrine_storage.maximum_size = shrine_storage[:maximum_size]
end

# Every read records the access; a read of a cold file also promotes it to hot.
class TieredStorage < Shrine::Storage::FileSystem
  def open(id, **options)
    Attachment.on_read(id) # cold reads are rare; unindexed lookup is fine
    super
  end
end

# Fall back to a subdir of store so an existing shrine.yml without :cold still boots.
cold_dir = shrine_storage[:cold] || File.join(shrine_storage[:store].to_s, 'cold')

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new(shrine_storage[:cache]), # temporary
  store: TieredStorage.new(shrine_storage[:store]), # permanent (hot tier)
  cold: TieredStorage.new(cold_dir), # permanent (cold/archive tier)
}

Shrine.plugin :activerecord           # loads Active Record integration
Shrine.plugin :derivatives
Shrine.plugin :cached_attachment_data # enables retaining cached file across form redisplays
Shrine.plugin :restore_cached_data    # extracts metadata for assigned cached files
Shrine.plugin :signature              # adds MD5 signature metadata to uploaded files
Shrine.plugin :determine_mime_type, analyzer: :marcel