# frozen_string_literal: true

class Versioning::Fetchers::ResearchPlanFetcher
  include ActiveModel::Model

  attr_accessor :research_plan, :prefix

  def self.call(**args)
    new(**args).call
  end

  def call
    research_plan_name = prefix.present? ? [prefix] : ['Research plan']
    versions = Versioning::Serializers::ResearchPlanSerializer.call(research_plan, research_plan_name)

    research_plan_metadata = research_plan.research_plan_metadata
    if research_plan_metadata
      research_plan_metadata.reload_log_data
      research_plan_metadata_name = prefix.present? ? [prefix, 'Metadata'] : ['Metadata']
      versions += Versioning::Serializers::ResearchPlanMetadataSerializer.call(research_plan_metadata,
                                                                               research_plan_metadata_name)
    end

    research_plan.attachments.with_log_data.each do |attachment|
      versions += Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                                     [prefix,
                                                                      "Attachment: #{attachment.filename}"].compact)
    end

    analyses_container = research_plan.container.children.where(container_type: :analyses).first
    analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.each do |analysis|
      versions += Versioning::Serializers::ContainerSerializer.call(analysis,
                                                                    [prefix, "Analysis: #{analysis.name}"].compact)

      analysis.children.with_deleted.with_log_data.each do |dataset|
        versions += Versioning::Serializers::ContainerSerializer.call(dataset,
                                                                      [prefix, "Analysis: #{analysis.name}",
                                                                       "Dataset: #{dataset.name}"].compact)

        dataset.attachments.with_log_data.each do |attachment|
          versions += Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                                         [prefix, "Analysis: #{analysis.name}",
                                                                          "Dataset: #{dataset.name}", "Attachment: #{attachment.filename}"].compact)
        end
      end
    end

    research_plan.literals.each do |literal|
      versions += Versioning::Serializers::LiteratureSerializer
                  .call(Literature.with_log_data.find(literal.literature_id), ["Reference: #{literal.litype}"])
    end

    versions
  end
end
