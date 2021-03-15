# == Schema Information
#
# Table name: collections_elements
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  element_id    :integer
#  deleted_at    :datetime
#  element_type  :string
#
# Indexes
#
#  index_collections_elements_on_collection_id                 (collection_id)
#  index_collections_elements_on_deleted_at                    (deleted_at)
#  index_collections_elements_on_element_id                    (element_id)
#  index_collections_elements_on_element_id_and_collection_id  (element_id,collection_id) UNIQUE
#

class CollectionsElement < ActiveRecord::Base
    acts_as_paranoid
    belongs_to :collection
    belongs_to :element

    include Tagging
    include Collecting

    def self.get_elements_by_collection_type(collection_ids, type)
      self.where(collection_id: collection_ids, element_type: type).pluck(:element_id).compact.uniq
    end

    def self.remove_in_collection(element_ids, from_col_ids)
      sample_ids = Element.get_associated_samples(element_ids)
      delete_in_collection(element_ids, from_col_ids)
      update_tag_by_element_ids(element_ids)
      CollectionsSample.remove_in_collection(sample_ids, from_col_ids)
    end

    def self.move_to_collection(element_ids, from_col_ids, to_col_ids, element_type='')
      sample_ids = Element.get_associated_samples(element_ids)
      delete_in_collection(element_ids, from_col_ids)
      static_create_in_collection(element_ids, to_col_ids)
      CollectionsSample.move_to_collection(sample_ids, from_col_ids, to_col_ids)
      CollectionsElement.where(collection_id: to_col_ids, element_id: element_ids)&.find_each { |ce| ce.update_columns(element_type: element_type) }
    end

    def self.create_in_collection(element_ids, to_col_ids, element_type='')
      sample_ids = Element.get_associated_samples(element_ids)
      static_create_in_collection(element_ids, to_col_ids)
      CollectionsSample.create_in_collection(sample_ids, to_col_ids)
      CollectionsElement.where(collection_id: to_col_ids, element_id: element_ids)&.find_each { |ce| ce.update_columns(element_type: element_type) }
    end
  end
