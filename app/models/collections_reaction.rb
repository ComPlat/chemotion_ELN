class CollectionsReaction < ActiveRecord::Base
  belongs_to :collection
  belongs_to :reaction

  after_create :add_to_all_collection

  # TODO maybe not the best way to handle the 'all' collection
  def add_to_all_collection
    unless Collection.find(collection_id).is_all_collection?
      user_id = Collection.find(collection_id).user_id
      all_collection = Collection.find_by(label: 'All', user_id: user_id)

      CollectionsReaction.create!(collection_id: all_collection.id, reaction_id: reaction_id)
    end
  end
end
