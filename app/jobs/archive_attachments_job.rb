# frozen_string_literal: true

# Moves old attachments to the ':cold' tier, either one collection's (run by hand
# via `rake storage:archive_collection[ID]`) or the orphans nobody owns (cron).
class ArchiveAttachmentsJob < ApplicationJob
  queue_as :archive_attachments

  # How old before a file is eligible. Overridable per deploy via the env var.
  DEFAULT_AGE_MONTHS = 12
  AGE_ENV_VAR = 'ARCHIVE_COLD_ATTACHMENTS_AGE_MONTHS'

  # Vessels are left out: uuid primary keys, and nothing hangs files off them.
  ELEMENT_ASSOCIATIONS = %i[
    samples reactions wellplates screens research_plans device_descriptions
    cellline_samples elements sequence_based_macromolecule_samples
  ].freeze

  # No collection_id (how the cron scheduler calls it) sweeps orphans instead.
  # @return [Hash] { archived:, children: } so the rake task can report it
  def perform(collection_id = nil, older_than: default_older_than)
    return { archived: 0, children: [] } if cold_storage_missing?

    if collection_id
      archive_collection(Collection.find(collection_id), older_than)
    else
      { archived: archive_orphans(older_than), children: [] }
    end
  end

  private

  def archive_collection(collection, older_than)
    archived = ELEMENT_ASSOCIATIONS.sum { |name| archive_elements_of(collection.public_send(name), older_than) }
    Rails.logger.info("[#{self.class.name}] collection #{collection.id}: archived #{archived} attachment(s)")
    { archived: archived, children: collection.children.pluck(:id) }
  end

  def archive_elements_of(elements, older_than)
    element_ids = elements.select("#{elements.klass.table_name}.id")
    archived = 0

    attachments_of(elements.klass.name, element_ids, older_than).find_each do |attachment|
      archived += 1 if attachment.cold?(older_than: older_than) && archive(attachment)
    end
    archived
  end

  # Files hang off the element directly (research plans) or off one of its
  # containers (anything with analyses), so look for both.
  def attachments_of(element_type, element_ids, older_than)
    root_containers = Container.where(containable_type: element_type, containable_id: element_ids).select(:id)
    # closure_tree rows include the root itself, so this covers analyses and datasets too
    container_ids = Container.hierarchy_class.where(ancestor_id: root_containers).select(:descendant_id)

    unread_since(older_than)
      .where(attachable_type: element_type, attachable_id: element_ids)
      .or(unread_since(older_than).where(attachable_type: 'Container', attachable_id: container_ids))
  end

  def archive_orphans(older_than)
    archived = 0
    orphan_scopes(older_than).each do |scope|
      scope.find_each { |attachment| archived += 1 if orphan_stale?(attachment, older_than) && archive(attachment) }
    end
    Rails.logger.info("[#{self.class.name}] archived #{archived} orphan attachment(s)")
    archived
  end

  # Two flavours of orphan: never attached, and pointing at a row that is gone or
  # in the trash (soft-deleted parents are excluded by their own default scope).
  def orphan_scopes(older_than)
    old = unread_since(older_than)
    scopes = [old.where(attachable_id: nil)]

    Attachment.distinct.where.not(attachable_type: nil).pluck(:attachable_type).each do |type|
      klass = type.safe_constantize
      next if klass.nil? || !klass.respond_to?(:select)

      scopes << old.where(attachable_type: type).where.not(attachable_id: klass.select(:id))
    end
    scopes
  end

  # Not Attachment#cold?: with no element, root_element falls back to the uploading
  # user, whose date says nothing about the file. Orphans go by their own dates.
  def orphan_stale?(attachment, older_than)
    return false if attachment.last_accessed_at.present? && attachment.last_accessed_at > older_than

    attachment.updated_at < older_than
  end

  # Running without a cold tier would crash on a nil storage, so bail early.
  def cold_storage_missing?
    return false if Attachment.cold_storage_keys.any?

    problem = "#{self.class.name} ran but no cold storage is configured (set :cold in config/shrine.yml)"
    Rails.logger.warn("[#{self.class.name}] #{problem}")
    StorageHealthMailer.unavailable([problem]).deliver_now
    true
  end

  # Mirrors the read guard in Attachment#cold?, so it can never drop a file cold? would keep.
  def unread_since(older_than)
    Attachment.where('last_accessed_at IS NULL OR last_accessed_at < ?', older_than)
  end

  # @return [Attachment, nil] the attachment if it moved, nil if there was nothing to move
  def archive(attachment)
    file = attachment.attachment
    # a row without a file must not abort the whole run
    return nil if file.nil? || Attachment.cold_storage_keys.include?(file.storage_key)

    attachment.move_to_cold
    Rails.logger.info("[#{self.class.name}] archived attachment #{attachment.id}")
    attachment
  end

  def default_older_than
    months = ENV.fetch(AGE_ENV_VAR, nil).to_i
    months = DEFAULT_AGE_MONTHS unless months.positive?
    months.months.ago
  end
end
