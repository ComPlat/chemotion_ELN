# frozen_string_literal: true

SAMPLES_TYPES = %w[startingMaterials products reactants solvents].freeze

class UpdateReactionVariations < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        # Add missing `analyses` and `notes` entries.
        variation['analyses'] ||= []
        variation['notes'] ||= ''

        SAMPLES_TYPES.each do |key|
          variation[key].each do |_, material|
            next unless material['value'] && material['unit']

            # Restructure `mass` entry.
            material['mass'] = { 'value' => material['value'].to_f / 1000, 'unit' => 'g' } # Standard unit was mg, convert to g.
            material.delete('value')
            material.delete('unit')

            # Add missing `amount` and `volume` entries.
            material['amount'] = { 'value' => 0, 'unit' => 'mol' }
            material['volume'] = { 'value' => 0, 'unit' => 'l' }
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
        variation.delete('analyses') if variation['analyses'].empty?
        variation.delete('notes') if variation['notes'].empty?

        SAMPLES_TYPES.each do |key|
          variation[key].each do |_, material|
            next unless material['mass'] && material['amount'] && material['volume']

            material['value'] = (material['mass']['value']&.to_f || 0) * 1000 # Standard unit was g, convert to mg.
            material['unit'] = 'mg'
            material.delete('mass')

            material.delete('amount')
            material.delete('volume')
          end
        end
      end
      reaction.update_column(:variations, variations)
    end
  end
end
