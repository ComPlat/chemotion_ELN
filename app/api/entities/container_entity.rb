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
    )
    expose :preview_img, if: ->(object, _options) { object.container_type == 'analysis' }

    expose :attachments, using: 'Entities::AttachmentEntity'
    expose :code_log, using: 'Entities::CodeLogEntity'
    expose :children, using: 'Entities::ContainerEntity'
    expose :dataset, using: 'Labimotion::DatasetEntity'

    def extended_metadata
      return unless object.extended_metadata

      report = (object.extended_metadata['report'] == 'true' || object.extended_metadata == 'true')

      {}.tap do |metadata|
        metadata[:report] = report
        metadata[:status] = object.extended_metadata['status']
        metadata[:kind] = object.extended_metadata['kind']
        metadata[:index] = object.extended_metadata['index']
        metadata[:instrument] = object.extended_metadata['instrument']
        if object.extended_metadata['content'].present?
          metadata[:content] =
            JSON.parse(object.extended_metadata['content'])
        end
        if object.extended_metadata['hyperlinks'].present?
          metadata[:hyperlinks] =
            JSON.parse(object.extended_metadata['hyperlinks'])
        end
      end
    end

    private

    # The frontend assumes the analysis (no other container types) to have a preview image.
    # Technically the images are attached to the analysis' dataset children though.
    # Therefore we have to collect all eligible images from the dataset children and display the newest
    # thumbnail available.
    def preview_img
      return unless object.container_type == 'analysis'

      attachments_with_thumbnail = Attachment.where(
        thumb: true,
        attachable_type: 'Container',
        attachable_id: object.children.where(container_type: :dataset),
      )
      return no_preview_image_available unless attachments_with_thumbnail.exists?

      latest_image_attachment = attachments_with_thumbnail.where(
        "attachment_data -> 'metadata' ->> 'mime_type' in (:value)",
        value: THUMBNAIL_CONTENT_TYPES,
      ).order(updated_at: :desc).first

      attachment = latest_image_attachment || attachments_with_thumbnail.first
      preview_image = attachment.read_thumbnail
      return no_preview_image_available unless preview_image

      {
        preview: Base64.encode64(preview_image),
        id: attachment.id,
        filename: attachment.filename,
      }
    end

    def no_preview_image_available
      { preview: 'not available', id: nil, filename: nil }
    end
  end
end
