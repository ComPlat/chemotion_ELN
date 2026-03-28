# frozen_string_literal: true

class Versioning::Fetchers::ReactionFetcher
  include ActiveModel::Model

  attr_accessor :reaction

  def self.call(**args)
    new(**args).call
  end

  def call
    versions = Versioning::Serializers::ReactionSerializer.call(reaction)

    reaction.reactions_samples.with_deleted.with_log_data.each do |reactions_sample|
      sample = Sample.with_log_data.with_deleted.find(reactions_sample.sample_id)

      sample_type = label_for_sample_type(reactions_sample.type)
      sample_name = (!sample_type.in?(%w[Reactant
                                         Solvent]) && sample.short_label).presence || sample.name.presence || sample.external_label.presence || sample.molecule.iupac_name || '-'

      versions += Versioning::Serializers::ReactionsSampleSerializer.call(reactions_sample,
                                                                          ["#{sample_type}: #{sample_name}"])
      versions += Versioning::Serializers::SampleSerializer.call(sample,
                                                                 ["#{sample_type}: #{sample_name} - Sample Properties"])

      versions += sample.residues.with_log_data.flat_map do |residue|
        Versioning::Serializers::ResidueSerializer.call(residue, ["#{sample_type}: #{sample_name} - Polymer section"])
      end

      versions += sample.elemental_compositions.with_log_data.flat_map do |elemental_composition|
        Versioning::Serializers::ElementalCompositionSerializer.call(elemental_composition,
                                                                     ["#{sample_type}: #{sample_name}
                                                                     - Elemental composition"])
      end

      analyses_container = sample.container.children.where(container_type: :analyses).first
      analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.each do |analysis|
        versions += Versioning::Serializers::ContainerSerializer.call(analysis,
                                                                      ["#{sample_type}: #{sample_name}",
                                                                       "Analysis: #{analysis.name}"])

        analysis.children.with_deleted.with_log_data.each do |dataset|
          versions += Versioning::Serializers::ContainerSerializer.call(dataset,
                                                                        ["#{sample_type}: #{sample_name}",
                                                                         "Analysis: #{analysis.name}", "Dataset: #{dataset.name}"])

          versions += dataset.attachments.with_log_data.flat_map do |attachment|
            Versioning::Serializers::AttachmentSerializer.call(attachment,
                                                               ["#{sample_type}: #{sample_name}", "Analysis: #{analysis.name}", "Dataset: #{dataset.name}",
                                                                "Attachment: #{attachment.filename}"])
          end
        end
      end
    end

    reaction.literals.each do |literal|
      versions += Versioning::Serializers::LiteratureSerializer
                  .call(Literature.with_log_data.find(literal.literature_id), ["Reference: #{literal.litype}"])
    end

    versions
  end

  private

  def label_for_sample_type(type)
    {
      ReactionsStartingMaterialSample: 'Starting material',
      ReactionsReactantSample: 'Reactant',
      ReactionsSolventSample: 'Solvent',
      ReactionsPurificationSolventSample: 'Purification solvent',
      ReactionsProductSample: 'Product',
    }[type.to_sym]
  end
end
