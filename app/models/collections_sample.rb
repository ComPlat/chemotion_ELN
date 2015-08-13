class CollectionsSample < ActiveRecord::Base
  belongs_to :collection
  belongs_to :sample

  after_create :add_to_all_collection

  private

  def add_to_all_collection
    unless Collection.find(collection_id).is_all_collection?
      user_id = Collection.find(collection_id).user_id
      all_collection = Collection.find_or_create_by(label: 'All', user_id: user_id)

      CollectionsSample.create!(collection_id: all_collection.id, sample_id: sample_id)
    end
  end
end
