# Gem shrine is now used to handle attachment files.
#
# This migration should create the shrine attachment_data for each attachment that has an existing file on the storage.
# !! The location set for the primary_store in config/storage.yml should match the location
#   set in config/shrine.yml store. !!
# The migration will be skipped if the legacy store routines are not present.
# Files in the legacy primary_store will not be moved but the attachment_data column of the attachments
#   DB Table will be updated so that the ELN can handle the attachments uploaded with the legacy lib
# Before that, the files that are not in the legacy primary_store (eg tmp) will be moved to it.
#

class MigrationAttachment < ActiveRecord::Base
  self.table_name = 'attachments'
end
class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
    return unless MigrationAttachment.new.respond_to?(:store)

    # compare shrine.yml with storage.yml
    shrine_storage = Rails.application.config_for :shrine
    legacy_storage = Rails.application.config_for :storage
    primary_store = legacy_storage[:primary_store]&.to_sym
    if shrine_storage[:store] != legacy_storage[:stores][primary_store][:data_folder]
      raise 'Shrine store location does not match storage.yml primary_store location'
    end

    # move files from tmp to primary_store
    MigrationAttachment.where.not(storage: primary_store).find_each do |att|
      next unless att.store.file_exist?

      att.update(storage: primary_store)
    end

    # update attachments with shrine attachment_data
    MigrationAttachment.where(attachment_data: [nil]).find_each do |att|
      begin
        next unless att.store.file_exist?

        Pathname(Shrine.storages[:store].directory).relative_path_from(Rails.root)
        file_id = Pathname(att.store.path).relative_path_from(att.store.data_folder).to_s
      rescue StandardError
        next
      end

      attachment = {
        id: file_id,
        storage: 'store',
        metadata: {
          filename: att.filename,
          md5: att.read_attribute(:checksum),
          size: File.size(att.store.path),
        }
      }
      thumb_path = att.store.thumb_path
      if File.file? thumb_path
        thumbnail = {
          id: "#{file_id}.thumb.jpg",
          storage: 'store',
          metadata: {
            size: File.size(thumb_path),
            filename: "#{att.identifier}.thumb.jpg",
          },
        }
        attachment = attachment.merge(derivatives: { thumbnail: thumbnail })
      end
      att.update_columns(attachment_data: attachment)
    end
  end
end
