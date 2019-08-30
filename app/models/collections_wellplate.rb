# == Schema Information
#
# Table name: collections_wellplates
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  wellplate_id  :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_wellplates_on_collection_id                   (collection_id)
#  index_collections_wellplates_on_deleted_at                      (deleted_at)
#  index_collections_wellplates_on_wellplate_id_and_collection_id  (wellplate_id,collection_id) UNIQUE
#

class CollectionsWellplate < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :wellplate

  include Tagging
  include Collecting

  # Remove from collection and process associated elements
  def self.remove_in_collection(wellplate_ids, collection_ids)
    # Get associated samples
    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)
    # Delete in collection
    delete_in_collection_with_filter(wellplate_ids, collection_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(wellplate_ids)
    # Delete associated in collection and update tag
    CollectionsSample.remove_in_collection(sample_ids, collection_ids)
  end

  def self.delete_in_collection_with_filter(wellplate_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)
      # from a collection, select wellplate_ids not associated with a screen
      ids = CollectionsWellplate.joins(
        <<~SQL
          left join screens_wellplates sw
          on sw.wellplate_id = collections_wellplates.wellplate_id and sw.deleted_at isnull
          left join collections_screens cs
          on cs.collection_id = #{cid} and cs.screen_id = sw.screen_id and cs.deleted_at isnull
        SQL
      ).where(
        "collections_wellplates.collection_id = #{cid} and collections_wellplates.wellplate_id in (?) and cs.id isnull",
        wellplate_ids
      ).pluck(:wellplate_id)
      delete_in_collection(ids, cid)
    end
  end

  def self.move_to_collection(wellplate_ids, from_col_ids, to_col_ids)
    # Get associated samples
    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)
    # Delete wellplates in old collection
    delete_in_collection_with_filter(wellplate_ids, from_col_ids)
    # Move associated samples in current collection
    CollectionsSample.move_to_collection(sample_ids, from_col_ids, to_col_ids)
    # Create new wellplates in target collection
    static_create_in_collection(wellplate_ids, to_col_ids)
  end

  def self.create_in_collection(wellplate_ids, collection_ids)
    # Get associated samples
    sample_ids = Well.get_samples_in_wellplates(wellplate_ids)
    # Create associated samples in collection
    CollectionsSample.create_in_collection(sample_ids, collection_ids)
    # Create new wellplate in collection
    static_create_in_collection(wellplate_ids, collection_ids)
  end
end
