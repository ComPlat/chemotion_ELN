# frozen_string_literal: true

class Versioning::Fetchers::SampleFetcher
  include ActiveModel::Model

  attr_accessor :sample

  def self.call(**args)
    new(**args).call
  end

  def call
    versions = Versioning::Serializers::SampleSerializer.call(sample)
    versions += sample.residues.with_log_data.flat_map do |residue|
      Versioning::Serializers::ResidueSerializer.call(residue)
    end
    versions += sample.elemental_compositions.with_log_data.flat_map do |elemental_composition|
      Versioning::Serializers::ElementalCompositionSerializer.call(elemental_composition)
    end

    analyses_container = sample.container.children.where(container_type: :analyses).first
    analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.each do |analysis|
      versions += Versioning::Serializers::ContainerSerializer.call(analysis, ["Analysis: #{analysis.name}"])

      analysis.children.with_deleted.with_log_data.each do |dataset|
        versions += Versioning::Serializers::ContainerSerializer.call(dataset,
                                                                      ["Analysis: #{analysis.name}",
                                                                       "Dataset: #{dataset.name}"])

        versions += dataset.attachments.with_log_data.flat_map do |attachment|
          Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                             ["Analysis: #{analysis.name}", "Dataset: #{dataset.name}",
                                                              "Attachment: #{attachment.filename}"])
        end
      end
    end

    versions
  end
end
