# frozen_string_literal: true

class AddMetadataToReactionVariations < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        variation['metadata'] ||= {}
        
        if variation['notes']
           variation['metadata']['notes'] = variation.delete('notes')
        end
        if variation['analyses']
           variation['metadata']['analyses'] = variation.delete('analyses')
        end
      end
      reaction.update_column(:variations, variations)
    end
  end

  def down
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        next unless variation['metadata']

        variation['notes'] ||= variation['metadata'].delete('notes') || ''
        variation['analyses'] ||= variation['metadata'].delete('analyses') || []
        variation.delete('metadata')
      end
      reaction.update_column(:variations, variations)
    end
  end
end
