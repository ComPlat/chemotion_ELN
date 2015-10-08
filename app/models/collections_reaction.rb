class CollectionsReaction < ActiveRecord::Base
  belongs_to :collection
  belongs_to :reaction
  validate :collection_reaction_id_uniqueness

  def collection_reaction_id_uniqueness
    unless CollectionsReaction.where(collection_id: collection_id, reaction_id: reaction_id).empty?
      errors.add(:collection_reaction_id_uniqueness, 'Violates uniqueness of reaction_id and collection_id')
    end
  end
end
