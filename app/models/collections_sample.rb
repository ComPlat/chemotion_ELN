class CollectionsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sample
  validates :collection, :sample, presence: true

  include Tagging

  def self.move_to_collection(sample_ids, old_col_id, new_col_id)
    # Delete in collection
    self.delete_in_collection(sample_ids, old_col_id)
    # Create new in target collection
    self.create_in_collection(sample_ids, new_col_id)
  end

  def self.delete_in_collection(sample_ids, collection_id)
    self.where(
      sample_id: sample_ids,
      collection_id: collection_id
    ).destroy_all
  end

  def self.remove_in_collection(sample_ids, collection_id)
    self.delete_in_collection(sample_ids, collection_id)
  end

  def self.create_in_collection(sample_ids, collection_id)
    sample_ids.map { |id|
      s = self.with_deleted.find_or_create_by(
        sample_id: id,
        collection_id: collection_id
      )

      s.restore! if s.deleted?
      s
    }
  end
end
