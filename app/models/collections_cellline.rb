# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_celllines
#
#  id                 :bigint           not null, primary key
#  collection_id      :integer
#  cellline_sample_id :integer
#  deleted_at         :datetime
#
# Indexes
#
#  index_collections_celllines_on_cellsample_id_and_coll_id  (cellline_sample_id,collection_id) UNIQUE
#  index_collections_celllines_on_collection_id              (collection_id)
#  index_collections_celllines_on_deleted_at                 (deleted_at)
#
class CollectionsCellline < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :cellline_sample

  include Tagging
  include Collecting

  # Remove from collection and process associated elements (and update collection info tag)
  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections
    delete_in_collection(element_ids, collection_ids)
    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  def self.move_to_collection(element_ids, from_collection_ids, to_colllection_ids)
    # Delete in collection
    delete_in_collection(element_ids, from_collection_ids)
    # Upsert in target collection
    insert_in_collection(element_ids, to_colllection_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  def self.create_in_collection(cellline_ids, to_col_id)
    static_create_in_collection(cellline_ids, to_col_id)
  end
end
