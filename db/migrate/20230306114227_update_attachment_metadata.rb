# frozen_string_literal: true

class UpdateAttachmentMetadata < ActiveRecord::Migration[6.1]
  def change
    return unless Attachment.last.respond_to?(:attachment_attacher)

    Attachment.find_each do |attachment|
      attacher = attachment&.attachment_attacher
      next unless attacher&.file&.exists?

      attachment_data = attachment.attachment_data
      attacher.refresh_metadata!
      metadata = attacher.file.metadata
      attachment_data = attachment_data.merge('metadata' => metadata)
      attachment.update_columns(attachment_data: attachment_data)
    end
  end
end
