class AddSegmentToReactionVariations < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        variation['segment_data'] ||= []
      end
      reaction.update_column(:variations, variations)
    end
  end

  def down
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        next unless variation['segment_data']
        variation.delete('segment_data')
      end
      reaction.update_column(:variations, variations)
    end
  end
end
