# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations
class RegenerateAttachmentThumbnails < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def up
    say_with_time('Regenerating only thumbnail derivatives via Shrine') do
      attachments = Attachment.where(
        "(attachment_data ->'metadata'->>'mime_type' LIKE ? OR attachment_data ->'metadata'->>'mime_type' LIKE ?)",
        'image/%', 'application/pdf'
      )
      attachments.find_each(batch_size: 100) do |attachment|
        regenerate_thumbnail_for(attachment)
      end
    end
  end

  private

  def regenerate_thumbnail_for(attachment)
    attacher = attachment.attachment_attacher
    file = attacher.file
    return unless file

    file_path = file.download
    file_extension = File.extname(file.id.to_s).delete('.')

    derivatives = generate_derivatives(file_extension, file_path, file, attachment)
    if derivatives.key?(:thumbnail)
      attacher.merge_derivatives(thumbnail: derivatives[:thumbnail])
      attachment.update_column(:attachment_data, attachment.attachment_data)
    else
      Rails.logger.warn { "No thumbnail derivative generated for attachment ##{attachment.id}" }
    end
  rescue StandardError => e
    Rails.logger.warn { "Failed to regenerate thumbnail for attachment ##{attachment.id}: #{e.class} - #{e.message}" }
  ensure
    file_path&.close! if file_path.respond_to?(:close!)
  end

  def generate_derivatives(file_extension, file_path, file, attachment)
    AttachmentUploader.create_derivatives(
      file_extension,
      file_path,
      file,
      attachment.id,
      attachment,
    )
  end
end
# rubocop:enable Rails/SkipsModelValidations
