# frozen_string_literal: true

# Once a reaction is copied, the samples of the copied reaction get new IDs.
# When the reaction has variations, those get copied as well.
# However, the variations keep a reference to the original sample IDs instead of the copied sample IDs.
# This UseCase updates the variations to match the copied sample IDs.
# Since the samples don't track their ancestry (i.e., the ID of the sample they were copied from),
# we rely on the molecule ID to match the copied samples to the original samples.
# The variations have to be updated in the backend, since initially, after copying,
# the samples only have a preliminary ID (UUID) in the frontend.

module Usecases
  module Reactions
    class UpdateVariations
      attr_reader :reaction, :variations

      MATERIAL_TYPES = %w[startingMaterials reactants products solvents].freeze
      UpdateVariationsError = Class.new(StandardError)

      def initialize(reaction)
        @reaction = reaction
        @variations = (reaction.variations || []).deep_dup
      end

      def execute!
        errors = []

        ActiveRecord::Base.transaction do
          updated_variations = update_variations(errors)
          raise UpdateVariationsError, errors.join("\n") unless errors.empty?

          @variations = updated_variations
        end
      rescue StandardError => e
        raise UpdateVariationsError, "Failed to update variations: #{e.message}"
      end

      private

      def update_variations(errors)
        sample_ids = get_sample_ids
        sample_ids_to_molecule_ids = if sample_ids.any?
                                       Sample.where(id: sample_ids)
                                             .pluck(:id, :molecule_id)
                                             .to_h
                                     else
                                       {}
                                     end

        @variations.map do |variation|
          updated_variation = variation.dup

          MATERIAL_TYPES.each do |material_type|
            material_type_key = material_type.underscore
            next unless updated_variation[material_type].is_a?(Hash)

            updated_variation[material_type] = update_group(
              updated_variation[material_type],
              material_type_key,
              sample_ids_to_molecule_ids,
              errors,
            )
          end
          updated_variation
        end
      end

      def get_sample_ids
        @variations.flat_map do |variation|
          MATERIAL_TYPES.flat_map do |material_type|
            next [] unless variation[material_type].is_a?(Hash)

            variation[material_type].keys.map(&:to_i)
          end
        end.uniq
      end

      def update_group(variation_group, material_type_key, sample_ids_to_molecule_ids, errors)
        reaction_samples = {}
        reaction.send(material_type_key).each do |sample|
          reaction_samples[sample.molecule_id] ||= sample # take first sample in case multiple samples with same molecule ID
        end

        variation_group.each_with_object({}) do |(sample_id, attrs), updated_variations_group|
          molecule_id = sample_ids_to_molecule_ids[sample_id.to_i]

          if molecule_id.nil?
            errors << "Sample #{sample_id} does not exist."
            updated_variations_group[sample_id] = attrs
            next
          end

          reaction_sample = reaction_samples[molecule_id]

          if reaction_sample
            updated_variations_group[reaction_sample.id] = attrs
          else
            errors << "Reaction has no sample in #{material_type_key} with molecule ID #{molecule_id}."
            updated_variations_group[sample_id] = attrs
          end
        end
      end
    end
  end
end
