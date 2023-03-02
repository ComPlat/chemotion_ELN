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

class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
    return unless Attachment.new.respond_to?(:store)

    # compare shrine.yml with storage.yml
    shrine_storage = Rails.application.config_for :shrine
    legacy_storage = Rails.application.config_for :storage
    primary_store = legacy_storage[:primary_store]
    if shrine_storage[:store] != legacy_storage[:stores][primary_store][:data_folder]
      raise 'Shrine store location does not match storage.yml primary_store location'
    end

    # move files from tmp to primary_store
    Attachment.where.not(storage: primary_store).find_each do |att|
      next unless att.store.file_exist?

      att.update(storage: primary_store)
    end

    # update attachments with shrine attachment_data
    Attachment.where(attachment_data: [nil]).find_each do |att|
      begin
        next unless att.store.file_exist?

        Pathname(Shrine.storages[:store].directory).relative_path_from(Rails.root)
        file_id = Pathname(att.store.path).relative_path_from(att.store.data_folder).to_s
      rescue StandardError
        next
      end

      attachment = { id: file_id, storage: 'store', metadata: { size: att.filesize, filename: att.filename } }
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
        attachment = {
          id: file_id,
          storage: 'store',
          metadata: {
            size: att.filesize,
            filename: att.filename,
            md5: att.md5,
         },
          derivatives: { thumbnail: thumbnail }
        }
      end
      ActiveRecord::Base.connection.execute(
        "UPDATE attachments SET attachment_data = '#{attachment.to_json}' where id = #{att.id}",
      )
    end
  end
end
