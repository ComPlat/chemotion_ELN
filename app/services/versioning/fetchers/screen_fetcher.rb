# frozen_string_literal: true

class Versioning::Fetchers::ScreenFetcher
  include ActiveModel::Model

  attr_accessor :screen

  def self.call(**args)
    new(**args).call
  end

  def call
    versions = Versioning::Serializers::ScreenSerializer.call(screen)

    analyses_container = screen.container.children.where(container_type: :analyses).first
    analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.each do |analysis|
      versions += Versioning::Serializers::ContainerSerializer.call(analysis, ["Analysis: #{analysis.name}"])

      analysis.children.with_deleted.with_log_data.each do |dataset|
        versions += Versioning::Serializers::ContainerSerializer.call(dataset, ["Analysis: #{analysis.name}", "Dataset: #{dataset.name}"])

        dataset.attachments.with_log_data.each do |attachment|
          versions += Versioning::Serializers::AttachmentSerializer.call(attachment, ["Analysis: #{analysis.name}", "Dataset: #{dataset.name}", "Attachment: #{attachment.filename}"])
        end
      end
    end

    screen.research_plans.each do |research_plan|
      versions += Versioning::Fetchers::ResearchPlanFetcher.call(research_plan: research_plan, prefix: "Research Plan: #{research_plan.name}")
    end

    versions
  end
end
