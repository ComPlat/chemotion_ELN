# frozen_string_literal: true

module Versioning
  module Fetchers
    class ScreenFetcher
      include ActiveModel::Model

      attr_accessor :screen

      def self.call(**args)
        new(**args).call
      end

      def call
        versions = Versioning::Serializers::ScreenSerializer.call(screen)
        versions += analyses_versions

        screen.research_plans.each do |research_plan|
          versions += Versioning::Fetchers::ResearchPlanFetcher.call(research_plan: research_plan,
                                                                     prefix: "Research Plan: #{research_plan.name}")
        end

        versions
      end

      private

      def analyses_versions
        analyses_container = screen.container.children.where(container_type: :analyses).first
        analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.flat_map do |analysis|
          analysis_label = "Analysis: #{analysis.name}"
          versions = Versioning::Serializers::ContainerSerializer.call(analysis, [analysis_label])

          versions + analysis.children.with_deleted.with_log_data.flat_map do |dataset|
            dataset_versions(dataset, [analysis_label])
          end
        end
      end

      def dataset_versions(dataset, analysis_labels)
        dataset_labels = [*analysis_labels, "Dataset: #{dataset.name}"]
        versions = Versioning::Serializers::ContainerSerializer.call(dataset, dataset_labels)
        versions + dataset.attachments.with_log_data.flat_map do |attachment|
          Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                             [*dataset_labels, "Attachment: #{attachment.filename}"])
        end
      end
    end
  end
end
