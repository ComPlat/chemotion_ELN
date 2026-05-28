# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_vessels
#
#  id            :uuid             not null, primary key
#  collection_id :bigint
#  vessel_id     :uuid
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_vessels_on_collection_id                (collection_id)
#  index_collections_vessels_on_deleted_at                   (deleted_at)
#  index_collections_vessels_on_vessel_id                    (vessel_id)
#  index_collections_vessels_on_vessel_id_and_collection_id  (vessel_id,collection_id) UNIQUE
#
class CollectionsVessel < ApplicationRecord
  acts_as_paranoid

  belongs_to :collection
  belongs_to :vessel

  include Tagging
  include Collecting

  def self.remove_in_collection(element_ids, collection_ids)
    delete_in_collection(element_ids, collection_ids)
    update_tag_by_element_ids(element_ids)
  end

  def self.move_to_collection(element_ids, from_col_ids, to_col_ids)
    delete_in_collection(element_ids, from_col_ids)
    insert_in_collection(element_ids, to_col_ids)
    update_tag_by_element_ids(element_ids)
  end

  def self.create_in_collection(element_ids, collection_ids)
    static_create_in_collection(element_ids, collection_ids)
  end
end
