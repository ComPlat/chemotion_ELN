class CollectionsResearchPlan < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :research_plan
  validates :collection, :research_plan, presence: true
  validate :collection_research_plan_id_uniqueness

  include Tagging

  def self.move_to_collection(research_plan_ids, old_col_id, new_col_id)
    # Delete research_plans in old collection
    self.delete_in_collection(research_plan_ids, old_col_id)

    # Create new research_plans in target collection
    self.static_create_in_collection(research_plan_ids, new_col_id)
  end

  # Static delete without checking associated
  def self.delete_in_collection(research_plan_ids, collection_id)
    self.where(
      research_plan_id: research_plan_ids,
      collection_id: collection_id
    ).delete_all
  end

  # Remove from collection and process associated elements
  def self.remove_in_collection(research_plan_ids, collection_id)
    self.delete_in_collection(research_plan_ids, collection_id)
  end

  # Static create without checking associated
  def self.static_create_in_collection(research_plan_ids, collection_id)
    research_plan_ids.map { |id|
      rp = self.with_deleted.find_or_create_by(
        research_plan_id: id,
        collection_id: collection_id
      )

      rp.restore! if rp.deleted?
      rp
    }
  end

  def self.create_in_collection(research_plan_ids, collection_id)
    # Create new research_plans in collection
    self.static_create_in_collection(research_plan_ids, collection_id)
  end

private

  def collection_research_plan_id_uniqueness
    unless CollectionsResearchPlan.where(collection_id: collection_id, research_plan_id: research_plan_id).empty?
      errors.add(:collection_research_plan_id_uniqueness, 'Violates uniqueness of research_plan_id and collection_id')
    end
  end
end
