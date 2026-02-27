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

    expose :attachments, using: 'Entities::AttachmentEntity', if: lambda { |object, _options|
                                                                    object.container_type == 'dataset'
                                                                  }
    expose :code_log, using: 'Entities::CodeLogEntity', if: ->(object, _options) { object.container_type == 'analysis' }
    expose :children, using: 'Entities::ContainerEntity', unless: lambda { |object, _options|
                                                                    object.container_type == 'dataset'
                                                                  }
    expose :dataset, using: 'Labimotion::DatasetEntity', if: ->(object, _options) { object.container_type == 'dataset' }

    # rubocop:disable Metrics/AbcSize
    def extended_metadata
      return unless object.extended_metadata

      report = object.extended_metadata['report'] == 'true' || object.extended_metadata == 'true'

      {}.tap do |metadata|
        metadata[:report] = report
        metadata[:status] = object.extended_metadata['status']
        metadata[:kind] = object.extended_metadata['kind']
        metadata[:index] = object.extended_metadata['index']
        metadata[:instrument] = object.extended_metadata['instrument']
        metadata[:preferred_thumbnail] = object.extended_metadata['preferred_thumbnail']
        if object.extended_metadata['content'].present?
          metadata[:content] =
            JSON.parse(object.extended_metadata['content'])
        end
        if object.extended_metadata['hyperlinks'].present?
          metadata[:hyperlinks] =
            JSON.parse(object.extended_metadata['hyperlinks'])
        end
        if object.extended_metadata && object.extended_metadata['general_description'].present?
          general_desc = object.extended_metadata['general_description']
          metadata[:general_description] = if general_desc.is_a?(String)
                                             begin
                                               JSON.parse(general_desc)
                                             rescue JSON::ParserError
                                               general_desc
                                             end
                                           else
                                             general_desc
                                           end
        end
      end
    end
    # rubocop:enable Metrics/AbcSize
  end
end
