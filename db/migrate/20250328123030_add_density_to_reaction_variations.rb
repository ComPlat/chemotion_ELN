# frozen_string_literal: true

MATERIAL_TYPES = %w[startingMaterials products reactants solvents].freeze

class AddDensityToReactionVariations < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        MATERIAL_TYPES.each do |material_type|
          variation[material_type].each_value do |material|
            material['aux']['density'] ||= 0
          end
        end
      end
      reaction.update_column(:variations, variations)
    end
  end

  def down
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        MATERIAL_TYPES.each do |material_type|
          variation[material_type].each_value do |material|
            material['aux'].delete('density')
          end
        end
      end
      reaction.update_column(:variations, variations)
    end
  end
end
