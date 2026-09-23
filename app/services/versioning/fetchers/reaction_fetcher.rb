# frozen_string_literal: true

module Versioning
  module Fetchers
    class ReactionFetcher
      include ActiveModel::Model

      attr_accessor :reaction

      def self.call(**args)
        new(**args).call
      end

      def call
        versions = Versioning::Serializers::ReactionSerializer.call(reaction)

        reaction.reactions_samples.with_deleted.with_log_data.each do |reactions_sample|
          versions += reactions_sample_versions(reactions_sample)
        end

        versions + literature_versions
      end

      private

      def reactions_sample_versions(reactions_sample)
        sample = Sample.with_log_data.with_deleted.find(reactions_sample.sample_id)
        sample_type = label_for_sample_type(reactions_sample.type)
        sample_label = "#{sample_type}: #{sample_name(sample, sample_type)}"

        versions = Versioning::Serializers::ReactionsSampleSerializer.call(reactions_sample, [sample_label])
        versions += Versioning::Serializers::SampleSerializer.call(sample, ["#{sample_label} - Sample Properties"])
        versions += sample.residues.with_log_data.flat_map do |residue|
          Versioning::Serializers::ResidueSerializer.call(residue, ["#{sample_label} - Polymer section"])
        end
        versions += sample.elemental_compositions.with_log_data.flat_map do |elemental_composition|
          Versioning::Serializers::ElementalCompositionSerializer.call(elemental_composition,
                                                                       ["#{sample_label} - Elemental composition"])
        end

        versions + analyses_versions(sample, sample_label)
      end

      def analyses_versions(sample, sample_label)
        analyses_container = sample.container.children.where(container_type: :analyses).first
        analyses_container.children.where(container_type: :analysis).with_deleted.with_log_data.flat_map do |analysis|
          analysis_label = "Analysis: #{analysis.name}"
          versions = Versioning::Serializers::ContainerSerializer.call(analysis, [sample_label, analysis_label])

          analysis.children.with_deleted.with_log_data.each do |dataset|
            dataset_labels = [sample_label, analysis_label, "Dataset: #{dataset.name}"]
            versions += Versioning::Serializers::ContainerSerializer.call(dataset, dataset_labels)
            versions += dataset.attachments.with_log_data.flat_map do |attachment|
              Versioning::Serializers::AttachmentSerializer.call(
                attachment, [*dataset_labels, "Attachment: #{attachment.filename}"]
              )
            end
          end

          versions
        end
      end

      def literature_versions
        reaction.literals.flat_map do |literal|
          Versioning::Serializers::LiteratureSerializer
            .call(Literature.with_log_data.find(literal.literature_id), ["Reference: #{literal.litype}"])
        end
      end

      def sample_name(sample, sample_type)
        (!sample_type.in?(%w[Reactant Solvent]) && sample.short_label).presence ||
          sample.name.presence || sample.external_label.presence || sample.molecule.iupac_name || '-'
      end

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
  end
end
