# frozen_string_literal: true

# rubocop:disable Metrics/AbcSize

module Versioning
  module Fetchers
    class WellplateFetcher
      include ActiveModel::Model

      attr_accessor :wellplate

      def self.call(**args)
        new(**args).call
      end

      def call
        versions = Versioning::Serializers::WellplateSerializer.call(wellplate)

        wellplate.wells.with_log_data.each do |well|
          versions += if well.position_y < 27
                        Versioning::Serializers::WellSerializer.call(
                          well, ["Well: (#{(well.position_y + 64).chr}#{well.position_x})"]
                        )
                      else
                        Versioning::Serializers::WellSerializer.call(
                          well, ["Well: (#{((well.position_y / 26) + 64).chr}" \
                                 "#{((well.position_y % 26) + 64).chr}#{well.position_x})"]
                        )
                      end
        end

        analyses_container = wellplate.container.children.where(container_type: :analyses).first
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
    end
  end
end

# rubocop:enable Metrics/AbcSize
