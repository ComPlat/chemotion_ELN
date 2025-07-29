# frozen_string_literal: true

module Versioning
  module Fetchers
    class DeviceDescriptionFetcher
      include ActiveModel::Model

      attr_accessor :device_description

      def self.call(**args)
        new(**args).call
      end

      # rubocop:disable Metrics/AbcSize
      def call
        versions = Versioning::Serializers::DeviceDescriptionSerializer.call(device_description)

        device_description.attachments.with_log_data.each do |attachment|
          versions += Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                                         ['Device Description',
                                                                          "Attachment: #{attachment.filename}"].compact)
        end

        analyses_container = device_description.container.children.where(container_type: :analyses).first
        analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.each do |analysis|
          versions += Versioning::Serializers::ContainerSerializer.call(analysis, ["Analysis: #{analysis.name}"])

          analysis.children.with_deleted.with_log_data.each do |dataset|
            versions += Versioning::Serializers::ContainerSerializer.call(dataset,
                                                                          ["Analysis: #{analysis.name}",
                                                                           "Dataset: #{dataset.name}"])

            versions += dataset.attachments.with_log_data.flat_map do |attachment|
              Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                                 ["Analysis: #{analysis.name}",
                                                                  "Dataset: #{dataset.name}",
                                                                  "Attachment: #{attachment.filename}"])
            end
          end
        end

        versions
      end
      # rubocop:enable Metrics/AbcSize
    end
  end
end
