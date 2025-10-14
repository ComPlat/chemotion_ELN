class AddGenericSegmentsToReactionVariations < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        variation['segments'] ||= {}
      end
      reaction.update_column(:variations, variations)
    end
  end

  def down
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        next unless variation['segments']
        variation.delete('segments')
      end
      reaction.update_column(:variations, variations)
    end
  end
end