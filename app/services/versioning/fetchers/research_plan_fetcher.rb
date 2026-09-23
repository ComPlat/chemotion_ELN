# frozen_string_literal: true

module Versioning
  module Fetchers
    class ResearchPlanFetcher
      include ActiveModel::Model

      attr_accessor :research_plan, :prefix

      def self.call(**args)
        new(**args).call
      end

      def call
        research_plan_name = prefix.present? ? [prefix] : ['Research plan']
        versions = Versioning::Serializers::ResearchPlanSerializer.call(research_plan, research_plan_name)
        versions += metadata_versions

        research_plan.attachments.with_log_data.each do |attachment|
          versions += Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                                         [prefix,
                                                                          "Attachment: #{attachment.filename}"].compact)
        end

        versions + analyses_versions + Versioning::Fetchers::LiteratureFetcher.call(element: research_plan)
      end

      private

      def metadata_versions
        research_plan_metadata = research_plan.research_plan_metadata
        return [] unless research_plan_metadata

        research_plan_metadata.reload_log_data
        research_plan_metadata_name = prefix.present? ? [prefix, 'Metadata'] : ['Metadata']
        Versioning::Serializers::ResearchPlanMetadataSerializer.call(research_plan_metadata,
                                                                     research_plan_metadata_name)
      end

      def analyses_versions
        analyses_container = research_plan.container.children.where(container_type: :analyses).first
        analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.flat_map do |analysis|
          analysis_labels = [prefix, "Analysis: #{analysis.name}"].compact
          versions = Versioning::Serializers::ContainerSerializer.call(analysis, analysis_labels)

          versions + analysis.children.with_deleted.with_log_data.flat_map do |dataset|
            dataset_versions(dataset, analysis_labels)
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
