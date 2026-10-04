# frozen_string_literal: true

# Repairs +conversion+ derivative entries written by an earlier
# {Usecases::Attachments::LoadImage} (on-the-fly TIFF to PNG conversion). Those entries hold
# only an +id+ (with a leading slash), no +storage+ and no +metadata+. Shrine cannot load such
# an entry, so every read of the attachment's derivatives fails: its preview, its thumbnail,
# and serializing the element that holds it.
#
# For each such entry:
# - the PNG is still on disk: the entry is rewritten in the shape Shrine writes on upload
#   (+id+ relative to the storage directory, +storage+, +metadata+);
# - the PNG is gone, or can't be seen from this host (e.g. the uploads volume isn't mounted
#   where the migration runs): the entry is removed, and the next preview converts the TIFF
#   again. Removing is always safe; leaving an entry Shrine can't load is not, as it keeps the
#   element from loading;
# - the attachment's storage isn't configured: the entry is left alone (its main file can't be
#   loaded either). It never aborts the run.
#
# The attacher is never loaded here (it would raise on these entries); only the raw
# +attachment_data+ column is read and written.
module RepairConversionDerivativesTask
  Result = Struct.new(:attachment_id, :action, :entry)

  # @param dry_run [Boolean] when true, nothing is written
  # @return [Array<Result>] one result per broken entry; +action+ is +:rewritten+, +:removed+
  #   or +:skipped+
  def self.execute!(dry_run: true)
    results = []
    # in batches: it runs as a migration on instances with many attachments
    broken_attachments.find_each do |attachment|
      result = repair(attachment)
      persist(attachment) unless dry_run || result.action == :skipped
      log(result, dry_run)
      results << result
    end
    results
  end

  # Attachments (soft-deleted ones included) whose +conversion+ entry has no +storage+ key.
  #
  # @return [ActiveRecord::Relation<Attachment>]
  def self.broken_attachments
    Attachment.with_deleted
              .where("attachment_data -> 'derivatives' -> 'conversion' IS NOT NULL")
              .where.not("attachment_data -> 'derivatives' -> 'conversion' ? 'storage'")
  end

  # Fixes the entry in memory (+attachment.attachment_data+); {.persist} writes it.
  #
  # @param attachment [Attachment]
  # @return [Result]
  def self.repair(attachment)
    data = attachment.attachment_data
    storage_key = data['storage'] || 'store'
    directory = storage_directory(storage_key)
    return Result.new(attachment.id, :skipped, nil) unless directory

    warn_if_unreachable(directory)
    id = data.dig('derivatives', 'conversion', 'id').to_s.sub(%r{\A/+}, '')
    path = File.join(directory, id)

    if id.present? && File.file?(path)
      data['derivatives']['conversion'] = shrine_entry(id, storage_key, path)
      Result.new(attachment.id, :rewritten, data['derivatives']['conversion'])
    else
      data['derivatives'].delete('conversion')
      Result.new(attachment.id, :removed, nil)
    end
  end

  # @return [String, nil] the storage's directory, or nil when the storage isn't a configured
  #   file system storage
  def self.storage_directory(storage_key)
    storage = Shrine.storages[storage_key.to_sym]
    storage.directory.to_s if storage.respond_to?(:directory)
  end

  def self.warn_if_unreachable(directory)
    return if File.directory?(directory)

    Rails.logger.warn("[RepairConversionDerivativesTask] storage directory #{directory} not found " \
                      'on this host; conversion entries are removed and regenerated on preview')
  end

  def self.shrine_entry(id, storage_key, path)
    {
      'id' => id,
      'storage' => storage_key,
      'metadata' => { 'filename' => File.basename(path), 'size' => File.size(path), 'mime_type' => 'image/png' },
    }
  end

  def self.persist(attachment)
    attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
  end

  def self.log(result, dry_run)
    verb = dry_run ? "would be #{result.action}" : result.action.to_s
    Rails.logger.info("[RepairConversionDerivativesTask] attachment ##{result.attachment_id}: conversion entry #{verb}")
  end
end
