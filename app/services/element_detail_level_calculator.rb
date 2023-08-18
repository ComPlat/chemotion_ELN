# frozen_string_literal: true

class ElementDetailLevelCalculator
  attr_reader :user, :element, :detail_levels

  DETAIL_LEVEL_FIELDS = %i[
    element_detail_level
    researchplan_detail_level
    sample_detail_level
    reaction_detail_level
    wellplate_detail_level
    screen_detail_level
  ].freeze

  def initialize(user:, element:)
    @user = user
    @element = element
    @detail_levels = calculate_detail_levels
  end

  private

  def calculate_detail_levels
    detail_levels = Hash.new(0)
    all_collections_detail_levels = user_collection_detail_levels + sync_collection_detail_levels

    detail_levels[Element] = all_collections_detail_levels.pluck(:element_detail_level).max || 0
    detail_levels[Reaction] = all_collections_detail_levels.pluck(:reaction_detail_level).max || 0
    detail_levels[ResearchPlan] = all_collections_detail_levels.pluck(:researchplan_detail_level).max || 0
    detail_levels[Sample] = all_collections_detail_levels.pluck(:sample_detail_level).max || 0
    detail_levels[Screen] = all_collections_detail_levels.pluck(:screen_detail_level).max || 0
    detail_levels[Wellplate] = all_collections_detail_levels.pluck(:wellplate_detail_level).max || 0
    detail_levels[Well] = detail_levels[Wellplate]

    detail_levels
  end

  # taken from API#group_ids
  def user_ids
    @user_ids ||= user.group_ids + [user.id]
  end

  # All collections containing the element that belong to the user or were shared to them
  def user_collections_with_element
    @user_collections_with_element ||= element.collections.where(user_id: user_ids)
  end

  # All collections containing the element that were synced to the current user
  def sync_collections_with_element
    @sync_collections_with_element ||=
     CollectionAcl.where(
        user_id: user_ids,
        collection_id: element.collections.ids,
      )
  end

  # Returns an array of Hashes. One hash per collection from user_collections_with_element.
  # Hash contains the all detail level attributes and their respective values + the is_shared field
  def user_collection_detail_levels
    @user_collection_detail_levels ||= user_collections_with_element
                                       .pluck(*DETAIL_LEVEL_FIELDS)
                                       .map { |values| Hash[DETAIL_LEVEL_FIELDS.zip(values)] }
  end

  # Returns an array of Hashes. One hash per collection from sync_collections_with_element.
  # Hash contains the all detail level attributes and their respective values
  def sync_collection_detail_levels
    @sync_collection_detail_levels ||= sync_collections_with_element
                                       .pluck(*DETAIL_LEVEL_FIELDS)
                                       .map { |values| Hash[DETAIL_LEVEL_FIELDS.zip(values)] }
  end
end
