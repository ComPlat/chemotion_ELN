# frozen_string_literal: true

# Once a reaction is copied, the samples of the copied reaction get new IDs.
# When the reaction has variations, those get copied as well.
# However, the variations keep a reference to the original sample IDs instead of the copied sample IDs.
# This UseCase updates the variations to match the copied sample IDs.

module Usecases
  module Reactions
    class UpdateVariations
      def initialize(reaction)
        @variations = reaction.variations.deep_dup
        @material_ids = {
          startingMaterials: reaction.starting_materials.pluck('id'),
          reactants: reaction.reactants.pluck('id'),
          products: reaction.products.pluck('id'),
          solvents: reaction.solvents.pluck('id'),
        }
      end

      def execute!
        material_groups = %w[startingMaterials reactants products solvents]
        @variations.each do |variation|
          material_groups.each do |material_group|
            variation_material_ids = variation[material_group].keys
            if variation_material_ids.size != @material_ids[material_group.to_sym].size
              raise "The variations do not contain the same number of #{material_group} as the reaction."
            end

            variation_material_ids.each_with_index do |key, index|
              variation[material_group][@material_ids[material_group.to_sym][index]] =
                variation[material_group].delete(key)
            end
          end
        end
        @variations
      end
    end
  end
end
