# == Schema Information
#
# Table name: collections_research_plans
#
#  id               :integer          not null, primary key
#  collection_id    :integer
#  research_plan_id :integer
#  deleted_at       :datetime
#
# Indexes
#
#  index_collections_research_plans_on_rplan_id_and_coll_id  (research_plan_id,collection_id) UNIQUE
#

class CollectionsResearchPlan < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :research_plan

  include Tagging
  include Collecting

  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections
    delete_in_collection(element_ids, collection_ids)
    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  def self.move_to_collection(element_ids, from_col_ids, to_col_ids)
    # Delete in collection
    delete_in_collection(element_ids, from_col_ids)
    # Upsert in target collection
    insert_in_collection(element_ids, to_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  def self.create_in_collection(element_ids, collection_ids)
    # upsert in target collection
    # update sample tag with collection info
    static_create_in_collection(element_ids, collection_ids)
  end
end
