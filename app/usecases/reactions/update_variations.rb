# frozen_string_literal: true

# Reconciles the material keys of a reaction's variations with the reaction's own materials.
#
# Once a reaction is copied, the samples of the copied reaction get new IDs.
# When the reaction has variations, those get copied as well.
# However, the variations keep a reference to the original sample IDs instead of the copied sample IDs.
# Since the samples don't track their ancestry (i.e., the ID of the sample they were copied from),
# we rely on the molecule ID to match the copied samples to the original samples.
# The variations have to be updated in the backend, since initially, after copying,
# the samples only have a preliminary ID (UUID) in the frontend.
#
# Per material group, a key that is one of the reaction's own materials is kept as is.
# Any other key is remapped to a not yet referenced material of the group with the same molecule.
# Keys that cannot be remapped (e.g., a material that has been removed from the reaction, and thus
# soft-deleted) are dropped, since the variations grid cannot display them.

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
        @variations = update_variations
      rescue StandardError => e
        raise UpdateVariationsError, "Failed to update variations: #{e.message}"
      end

      private

      def update_variations
        molecule_ids = sample_molecule_ids
        materials = MATERIAL_TYPES.index_with { |material_type| reaction_materials(material_type) }

        @variations.map do |variation|
          updated_variation = variation.dup

          MATERIAL_TYPES.each do |material_type|
            next unless updated_variation[material_type].is_a?(Hash)

            updated_variation[material_type] = update_group(
              updated_variation[material_type],
              material_type,
              materials[material_type],
              molecule_ids,
            )
          end
          updated_variation
        end
      end

      # Maps the variations' sample keys to molecule IDs.
      # Soft-deleted samples are excluded, so keys of removed materials don't resolve to a molecule.
      def sample_molecule_ids
        sample_ids = @variations.flat_map do |variation|
          MATERIAL_TYPES.flat_map do |material_type|
            next [] unless variation[material_type].is_a?(Hash)

            variation[material_type].keys.map(&:to_s).grep(/\A\d+\z/)
          end
        end.uniq
        return {} if sample_ids.empty?

        Sample.where(id: sample_ids).pluck(:id, :molecule_id).to_h.transform_keys(&:to_s)
      end

      # Maps the variations keys of the reaction's materials of a group (in position order) to their molecule IDs.
      def reaction_materials(material_type)
        samples = reaction.public_send(material_type.underscore)
        materials = samples.to_h { |sample| [sample.id.to_s, sample.molecule_id] }
        return materials unless material_type == 'reactants'

        # Sequence-based macromolecule samples are keyed as "sbmm:<id>" in the frontend.
        materials.merge(reaction.reactant_sbmm_samples.to_h { |sbmm_sample| ["sbmm:#{sbmm_sample.id}", nil] })
      end

      def update_group(variation_group, material_type, materials, molecule_ids)
        group = variation_group.transform_keys(&:to_s)
        updated_group = group.slice(*materials.keys)
        unreferenced_materials = materials.except(*updated_group.keys)

        group.except(*updated_group.keys).sort_by { |key, _| [key.to_i, key] }.each do |key, entry|
          molecule_id = molecule_ids[key]
          material_key = molecule_id && unreferenced_materials.key(molecule_id)

          if material_key
            unreferenced_materials.delete(material_key)
            updated_group[material_key] = entry
          else
            Rails.logger.warn("UpdateVariations: reaction #{reaction.id}: dropped #{material_type} key #{key}")
          end
        end
        updated_group
      end
    end
  end
end
