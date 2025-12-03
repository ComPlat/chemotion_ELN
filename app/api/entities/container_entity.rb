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
    expose :comparable_info, if: ->(object, _options) { object.container_type == 'analysis' }

    expose :attachments, using: 'Entities::AttachmentEntity', if: lambda { |object, _options|
                                                                    object.container_type == 'dataset' || (object.container_type == 'analysis' && object.extended_metadata['is_comparison'] == 'true')
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
        if object.extended_metadata['content'].present?
          metadata[:content] =
            JSON.parse(object.extended_metadata['content'])
        end
        if object.extended_metadata['hyperlinks'].present?
          metadata[:hyperlinks] =
            JSON.parse(object.extended_metadata['hyperlinks'])
        end
        if object.extended_metadata['is_comparison'].present?
          metadata[:is_comparison] = object.extended_metadata['is_comparison'] == 'true'
        end
        if object.extended_metadata['analyses_compared'].present?
          raw_ac = object.extended_metadata['analyses_compared']
          metadata[:analyses_compared] = if raw_ac.is_a?(String)
                                           begin
                                             JSON.parse(raw_ac.gsub('=>', ':').gsub(/\bnil\b/, 'null'))
                                           rescue StandardError
                                             []
                                           end
                                         else
                                           raw_ac
                                         end
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

      comparison_thumbnail = Attachment.where(
        thumb: true,
        attachable_type: 'Container',
        attachable_id: object.id,
      )

      unless attachments_with_thumbnail.exists?
        build_preview_image(comparison_thumbnail)
      else
        build_preview_image(attachments_with_thumbnail)
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

      is_comparison = object.extended_metadata['is_comparison'].present? && object.extended_metadata['is_comparison'] == 'true'

      list_attachments = []
      list_dataset = []
      list_analyses = []
      layout = ''
      if object.extended_metadata['analyses_compared'].present?
        raw_ac = object.extended_metadata['analyses_compared']
        analyses_compared = if raw_ac.is_a?(String)
                              begin
                                JSON.parse(raw_ac.gsub('=>', ':').gsub(/\bnil\b/, 'null'))
                              rescue StandardError
                                []
                              end
                            else
                              raw_ac
                            end
        analyses_compared = [] unless analyses_compared.is_a?(Array)

        analyses_compared.each do |attachment_info|
          layout = attachment_info['layout']
          attachment = Attachment.find_by(id: attachment_info['file']['id'])
          dataset = Container.find_by(id: attachment_info['dataset']['id'])
          analyis = Container.find_by(id: attachment_info['analysis']['id'])
          list_attachments.push(attachment) if attachment.nil? == false
          list_dataset.push(dataset)
          list_analyses.push(analyis)
        end
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
# rubocop:enable Metrics/AbcSize
