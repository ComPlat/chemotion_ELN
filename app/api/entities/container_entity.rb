# frozen_string_literal: true

module Entities
  class ContainerEntity < ApplicationEntity
    THUMBNAIL_CONTENT_TYPES = %w[image/jpg image/jpeg image/png image/tiff].freeze
    expose(
      :id,
      :name,
      :container_type,
      :description,
      :extended_metadata,
      :preview_img
    )

    expose :attachments, using: 'Entities::AttachmentEntity'
    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :children, using: 'Entities::ContainerEntity'
    expose :dataset, using: 'Entities::DatasetEntity'

    def extended_metadata
      return unless object.extended_metadata

      report = (object.extended_metadata['report'] == 'true' || object.extended_metadata == 'true')

      {}.tap do |metadata|
        metadata[:report] = report
        if object.extended_metadata['content'].present?
          metadata[:content] = object.extended_metadata['content']
        end
        if object.extended_metadata['hyperlinks'].present?
          metadata[:hyperlinks] = metadata['hyperlinks']
        end
      end
    end

    private

    def preview_img
      attachments_with_thumbnail = object.attachments.where(thumb: true)
      return no_preview_image_available unless attachments_with_thumbnail.exists?

      latest_image_attachment = attachments_with_thumbnails
                                .where(content_type: THUMBNAIL_CONTENT_TYPES)
                                .order(updated_at: :desc)
                                .first

      attachment = latest_image_attachment || attachments_with_thumbnail.first
      preview_image = attachment.read_thumbnail
      return no_preview_image_available unless preview_image

      {
        preview: Base64.encode64(preview_image),
        id: attachment.id,
        filename: attachment.filename
      }
    end

    def no_preview_image_available
      { preview: 'not available', id: nil, filename: nil }
    end
  end
end
