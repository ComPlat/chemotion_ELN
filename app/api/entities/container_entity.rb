# frozen_string_literal: true

module Entities
  class ContainerEntity < ApplicationEntity
    THUMBNAIL_CONTENT_TYPES = %w[image/jpg image/jpeg image/png image/tiff].freeze

    # dataset nodes and analysis nodes used for spectra comparison
    EXPOSE_ATTACHMENTS = lambda { |object, _options|
      return true if object.container_type == 'dataset'
      return false unless object.container_type == 'analysis'

      Entities::ContainerEntity.comparison_flag?(object.extended_metadata&.[]('is_comparison'))
    }.freeze

    expose(
      :id,
      :name,
      :container_type,
      :description,
      :extended_metadata,
    )
    expose :preview_img, if: ->(object, _options) { object.container_type == 'analysis' }
    expose :comparable_info, if: ->(object, _options) { object.container_type == 'analysis' }

    expose :attachments, using: 'Entities::AttachmentEntity', if: EXPOSE_ATTACHMENTS
    expose :code_log, using: 'Entities::CodeLogEntity', if: ->(object, _options) { object.container_type == 'analysis' }
    expose :children, using: 'Entities::ContainerEntity', unless: lambda { |object, _options|
      object.container_type == 'dataset'
    }
    expose :dataset, using: 'Labimotion::DatasetEntity', if: ->(object, _options) { object.container_type == 'dataset' }

    def self.comparison_flag?(value)
      [true, 'true'].include?(value)
    end

    def extended_metadata
      return unless object.extended_metadata

      build_extended_metadata_hash
    end

    private

    def build_extended_metadata_hash
      ext_meta = object.extended_metadata
      report = ext_meta['report'] == 'true' || ext_meta == 'true'

      {}.tap do |metadata|
        fill_core_metadata_fields(metadata, ext_meta, report)
        assign_parsed_json_field(metadata, :content, ext_meta['content'])
        assign_parsed_json_field(metadata, :hyperlinks, ext_meta['hyperlinks'])
        assign_general_description_field(metadata, ext_meta)
        if ext_meta['is_comparison'].present?
          metadata[:is_comparison] = self.class.comparison_flag?(ext_meta['is_comparison'])
        end
        assign_analyses_compared_field(metadata, ext_meta)
      end
    end

    def fill_core_metadata_fields(metadata, ext_meta, report)
      metadata[:report] = report
      metadata[:status] = ext_meta['status']
      metadata[:kind] = ext_meta['kind']
      metadata[:index] = ext_meta['index']
      metadata[:instrument] = ext_meta['instrument']
      metadata[:preferred_thumbnail] = ext_meta['preferred_thumbnail']
    end

    def assign_parsed_json_field(metadata, key, raw)
      return if raw.blank?

      metadata[key] = JSON.parse(raw)
    end

    def assign_general_description_field(metadata, ext_meta)
      return unless ext_meta && ext_meta['general_description'].present?

      general_desc = ext_meta['general_description']
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

    def assign_analyses_compared_field(metadata, ext_meta)
      return if ext_meta['analyses_compared'].blank?

      raw_ac = ext_meta['analyses_compared']
      metadata[:analyses_compared] = parse_analyses_compared_raw(raw_ac)
    end

    def parse_analyses_compared_raw(raw_ac)
      if raw_ac.is_a?(String)
        begin
          JSON.parse(raw_ac.gsub('=>', ':').gsub(/\bnil\b/, 'null'))
        rescue StandardError
          []
        end
      else
        raw_ac
      end
    end

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

      comparison_thumbnail = Attachment.where(
        thumb: true,
        attachable_type: 'Container',
        attachable_id: object.id,
      )

      if attachments_with_thumbnail.exists?
        build_preview_image(attachments_with_thumbnail)
      else
        build_preview_image(comparison_thumbnail)
      end
    end

    def build_preview_image(attachments_with_thumbnail)
      return no_preview_image_available unless attachments_with_thumbnail.exists?

      atts_with_thumbnail = attachments_with_thumbnail.where(
        "attachment_data -> 'metadata' ->> 'mime_type' in (:value)",
        value: THUMBNAIL_CONTENT_TYPES,
      ).order(updated_at: :desc)

      combined_image_attachment = atts_with_thumbnail.where(
        'filename LIKE ?', '%combined%'
      ).order(updated_at: :desc).first

      latest_image_attachment = atts_with_thumbnail.first

      attachment = combined_image_attachment || latest_image_attachment || attachments_with_thumbnail.first
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

    def comparable_info
      return unless object.container_type == 'analysis'

      is_comparison = comparison_flag_true?
      return default_comparable_info(is_comparison) if object.extended_metadata['analyses_compared'].blank?

      build_comparable_info_from_compared(is_comparison)
    end

    def comparison_flag_true?
      self.class.comparison_flag?(object.extended_metadata&.[]('is_comparison'))
    end

    def default_comparable_info(is_comparison)
      {
        is_comparison: is_comparison,
        list_attachments: [],
        list_dataset: [],
        list_analyses: [],
        layout: '',
      }
    end

    def build_comparable_info_from_compared(is_comparison)
      raw_ac = object.extended_metadata['analyses_compared']
      analyses_compared = parse_analyses_compared_raw(raw_ac)
      analyses_compared = [] unless analyses_compared.is_a?(Array)

      list_attachments = []
      list_dataset = []
      list_analyses = []
      layout = ''
      analyses_compared.each do |attachment_info|
        layout = attachment_info['layout']
        attachment = Attachment.find_by(id: attachment_info['file']['id'])
        dataset = Container.find_by(id: attachment_info['dataset']['id'])
        analysis = Container.find_by(id: attachment_info['analysis']['id'])
        list_attachments << attachment if attachment
        list_dataset.push(dataset)
        list_analyses.push(analysis)
      end

      {
        is_comparison: is_comparison,
        list_attachments: list_attachments,
        list_dataset: list_dataset,
        list_analyses: list_analyses,
        layout: layout,
      }
    end
  end
end
