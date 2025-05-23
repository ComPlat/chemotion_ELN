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
  end
end
