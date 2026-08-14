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

    AI_SPECTRAL_KEYS = %w[ai_spectral_data ai_spectral_extraction_error].freeze

    def extended_metadata
      meta = object.extended_metadata
      return unless meta

      base_metadata(meta).merge(parsed_metadata(meta))
    end

    private

    def base_metadata(meta)
      {
        report: meta['report'] == 'true' || meta == 'true',
        status: meta['status'],
        kind: meta['kind'],
        index: meta['index'],
        instrument: meta['instrument'],
        preferred_thumbnail: meta['preferred_thumbnail'],
      }
    end

    # The JSON-valued keys. content/hyperlinks are written by the ELN itself, so a
    # parse error there is a real bug and must surface; the AI keys are written by a
    # background job, where a truncated or legacy value must not take the whole
    # container payload down with it.
    def parsed_metadata(meta)
      parsed = {}
      parsed[:content] = JSON.parse(meta['content']) if meta['content'].present?
      parsed[:hyperlinks] = JSON.parse(meta['hyperlinks']) if meta['hyperlinks'].present?

      AI_SPECTRAL_KEYS.each do |key|
        next if meta[key].blank?

        parsed[key.to_sym] = parse_json_or_nil(meta[key])
      end

      general = meta['general_description']
      parsed[:general_description] = parsed_general_description(general) if general.present?
      parsed
    end

    def parse_json_or_nil(value)
      JSON.parse(value)
    rescue JSON::ParserError
      nil
    end

    # Older records store this as a JSON string, newer ones as the object itself;
    # an unparseable string is passed through rather than dropped.
    def parsed_general_description(value)
      return value unless value.is_a?(String)

      JSON.parse(value)
    rescue JSON::ParserError
      value
    end
  end
end
