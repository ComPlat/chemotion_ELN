class CollectionsWellplate < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :wellplate

  include Tagging

  def self.move_to_collection(wellplate_ids, old_col_id, new_col_id)
    # Get associated samples
    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)

    # Delete wellplates in old collection
    self.delete_in_collection(wellplate_ids, old_col_id)

    # Move associated samples in current collection
    CollectionsSample.move_to_collection(sample_ids, old_col_id, new_col_id)

    # Create new wellplates in target collection
    self.static_create_in_collection(wellplate_ids, new_col_id)
  end

  # Static delete without checking associated
  def self.delete_in_collection(wellplate_ids, collection_id)
    self.where(
      wellplate_id: wellplate_ids,
      collection_id: collection_id
    ).destroy_all
  end

  # Remove from collection and process associated elements
  def self.remove_in_collection(wellplate_ids, collection_id)
    self.delete_in_collection(wellplate_ids, collection_id)

    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)
    CollectionsSample.remove_in_collection(sample_ids, collection_id)
  end

  # Static create without checking associated
  def self.static_create_in_collection(wellplate_ids, collection_id)
    wellplate_ids.map { |id|
      w = self.with_deleted.find_or_create_by(
        wellplate_id: id,
        collection_id: collection_id
      )

      w.restore! if w.deleted?
      w
    }
  end

  def self.create_in_collection(wellplate_ids, collection_id)
    # Get associated samples
    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)

    # Create associated samples in collection
    CollectionsSample.create_in_collection(sample_ids, collection_id)
    # Create new wellplate in collection
    self.static_create_in_collection(wellplate_ids, collection_id)
  end
end
