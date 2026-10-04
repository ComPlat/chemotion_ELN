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
# - the PNG is gone: the entry is removed, and the next preview converts the TIFF again.
#
# The attacher is never loaded here (it would raise on these entries); only the raw
# +attachment_data+ column is read and written.
module RepairConversionDerivativesTask
  Result = Struct.new(:attachment_id, :action, :entry)

  # @param dry_run [Boolean] when true, nothing is written
  # @return [Array<Result>] one result per broken entry; +action+ is +:rewritten+ or +:removed+
  def self.execute!(dry_run: true)
    broken_attachments.map do |attachment|
      result = repair(attachment)
      persist(attachment) unless dry_run
      log(result, dry_run)
      result
    end
  end

  # Attachments (soft-deleted ones included) whose +conversion+ entry has no +storage+ key.
  #
  # @return [ActiveRecord::Relation<Attachment>]
  def self.broken_attachments
    Attachment.with_deleted
              .where("attachment_data -> 'derivatives' -> 'conversion' IS NOT NULL")
              .where.not("attachment_data -> 'derivatives' -> 'conversion' ? 'storage'")
              .order(:id)
  end

  # Fixes the entry in memory (+attachment.attachment_data+); {.persist} writes it.
  #
  # @param attachment [Attachment]
  # @return [Result]
  def self.repair(attachment)
    data = attachment.attachment_data
    storage_key = data['storage'] || 'store'
    id = data.dig('derivatives', 'conversion', 'id').to_s.sub(%r{\A/+}, '')
    path = File.join(Shrine.storages[storage_key.to_sym].directory.to_s, id)

    if id.present? && File.file?(path)
      data['derivatives']['conversion'] = shrine_entry(id, storage_key, path)
      Result.new(attachment.id, :rewritten, data['derivatives']['conversion'])
    else
      data['derivatives'].delete('conversion')
      Result.new(attachment.id, :removed, nil)
    end
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
