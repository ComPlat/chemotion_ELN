# == Schema Information
#
# Table name: collections_vessels
#
#  id            :bigint           not null, primary key
#  collection_id :integer
# vessel_id     :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_vessels_on_collection_id                (collection_id)
#  index_collections_vessels_on_deleted_at                   (deleted_at)
#  index_collections_vessels_on_vessel_id_and_collection_id  (vessel_id,collection_id) UNIQUE
#
class CollectionsVessel < ApplicationRecord
  acts_as_paranoid

  belongs_to :collection
  belongs_to :vessel
  
  include Tagging
  include Collecting

  # Remove from collection and process associated elements
  def self.remove_in_collection(vessel_ids, from_col_ids)
    # Remove vessels from collection
    delete_in_collection(vessel_ids, from_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(vessel_ids)
  end

  def self.move_to_collection(vessel_ids, from_col_ids, to_col_ids)
    # Remove vessels from collection
    delete_in_collection(vessel_ids, from_col_ids)
    # Associate vessels to collection
    static_create_in_collection(vessel_ids, to_col_ids)
  end

  def self.create_in_collection(vessel_ids, to_col_ids)
    # Associate vessels to collection
    static_create_in_collection(vessel_ids, to_col_ids)
  end
end
