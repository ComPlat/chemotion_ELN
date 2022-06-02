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
      thumbnail_attachment = object.attachments.find_by(thumb: true, content_type: THUMBNAIL_CONTENT_TYPES)
      return no_preview_image_available unless thumbnail_attachment

      preview_image = thumbnail_attachment.read_thumbnail
      return no_preview_image_available unless preview_image

      {
        preview: Base64.encode64(preview_image),
        id: thumbnail_attachment.id,
        filename: thumbnail_attachment.filename
      }
    end

    def no_preview_image_available
      { preview: 'not available', id: nil, filename: nil }
    end
  end
end
