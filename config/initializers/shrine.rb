require "shrine"
require "shrine/storage/file_system"
shrine_storage = Rails.application.config_for :shrine

Rails.application.configure do
  config.shrine_storage = ActiveSupport::OrderedOptions.new
  config.shrine_storage.maximum_size = shrine_storage[:maximum_size]
end

# Every read records the access date, so a recently-read file isn't archived.
class TieredStorage < Shrine::Storage::FileSystem
  def open(id, **options)
    Attachment.on_read(id) # cold reads are rare; unindexed lookup is fine
    super
  end
end

# One :cold path per shelf, each normally a mount or symlink to bulk storage
# (LSDF/NFS). No :cold in shrine.yml means no cold tier, so archiving is off.
cold_shelves = Array(shrine_storage[:cold]).each_with_index.to_h do |path, index|
  [index.zero? ? :cold : :"cold#{index + 1}", TieredStorage.new(path)]
end

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new(shrine_storage[:cache]), # temporary
  store: TieredStorage.new(shrine_storage[:store]), # permanent (hot tier)
}.merge(cold_shelves) # cold, cold2, ... (only if configured)

Shrine.plugin :activerecord           # loads Active Record integration
Shrine.plugin :derivatives
Shrine.plugin :cached_attachment_data # enables retaining cached file across form redisplays
Shrine.plugin :restore_cached_data    # extracts metadata for assigned cached files
Shrine.plugin :signature              # adds MD5 signature metadata to uploaded files
Shrine.plugin :determine_mime_type, analyzer: :marcel

# Catches a renamed folder or dropped mount before users hit broken files.
class StorageHealth
  REQUIRED_TIERS = %i[store].freeze

  # verify_files queries the DB, so it stays off at boot (models aren't loaded yet).
  def self.problems(verify_files: false)
    found = tiers_to_check.filter_map do |tier|
      reason = unavailable_reason(tier, Shrine.storages[tier], verify_files)
      "tier '#{tier}': #{reason}" if reason
    end
    lost = lost_cold_tier_reason if verify_files
    lost ? found << lost : found
  end

  # store always, plus every cold shelf that's configured (cold, cold2, ...).
  def self.tiers_to_check
    cold = Shrine.storages.keys.select { |k| k.to_s.match?(/\Acold\d*\z/) }
    (REQUIRED_TIERS + cold).uniq
  end

  # Archived rows keep pointing at cold after the config goes away (unset var,
  # dropped mount), and then no cold tier is left for tiers_to_check to look at.
  def self.lost_cold_tier_reason
    return nil if Shrine.storages.keys.any? { |k| k.to_s.match?(/\Acold\d*\z/) }
    return nil unless Attachment.where("attachment_data->>'storage' LIKE 'cold%'").exists?

    'archived files exist but no cold storage is configured (set :cold in config/shrine.yml)'
  end

  def self.log_problems(logger = Rails.logger)
    problems.each { |p| logger.warn("[StorageHealth] #{p}") }
  end

  def self.unavailable_reason(tier, storage, verify_files)
    return 'not configured' if storage.nil?
    return nil unless storage.respond_to?(:directory)

    local_reason(storage) || (verify_files ? missing_files_reason(tier, storage) : nil)
  end

  def self.local_reason(storage)
    dir = storage.directory.to_s
    return 'directory missing' unless File.directory?(dir)
    return 'directory not writable' unless File.writable?(dir)

    nil
  end

  # Shrine recreates a missing directory at boot, so a renamed folder comes back
  # empty and looks fine. Check a file we expect on this tier is really there.
  def self.missing_files_reason(tier, storage)
    sample = sample_file_id(tier)
    return nil if sample.nil? # nothing archived here yet
    return 'files missing (folder moved or emptied?)' unless storage.exists?(sample)

    nil
  end

  def self.sample_file_id(tier)
    Attachment.where("attachment_data->>'storage' = ?", tier.to_s)
              .limit(1)
              .pick(Arel.sql("attachment_data->>'id'"))
  end
end

StorageHealth.log_problems
