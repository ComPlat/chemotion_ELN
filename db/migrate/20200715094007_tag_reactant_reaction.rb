class TagReactantReaction < ActiveRecord::Migration
  def change
    output_data = ''
    ReactionsSample.where(type: 'ReactionsReactantSample').find_each do |rs|
      tag = ElementTag.find_by(taggable_type: 'Sample', taggable_id: rs.sample_id)
      data = tag.taggable_data || {}
      data['reaction_id'] = rs.reaction_id
      tag.update_columns(taggable_data: data)
    end
    rescue Exception => e
  end
end
