# frozen_string_literal: true

class ElementDetailLevelCalculator
  attr_reader :user, :element
  attr_reader :element_detail_level, :nested_detail_levels

  DETAIL_LEVEL_FIELDS = %i[
    element_detail_level
    researchplan_detail_level
    sample_detail_level
    reaction_detail_level
    wellplate_detail_level
    screen_detail_level
  ]

  def initialize(user:, element:)
    @user = user
    @element = element
    @nested_detail_levels = {}

    calculate_element_detail_level
    calculate_nested_detail_levels
  end

  private

  def calculate_element_detail_level
    element_detail_level_field = "#{element.class.to_s.downcase}_detail_level".to_sym
    element_is_from_own_unshared_collection = user_collection_detail_levels.any? { |entry| !entry[:is_shared] }
    max_detail_level_from_collections = [
      user_collection_detail_levels.map { |entry| entry[element_detail_level_field] },
      sync_collection_detail_levels.map { |entry| entry[element_detail_level_field] }
    ].flatten.max

    puts "Max Detail Level from collection"
    puts max_detail_level_from_collections

    @element_detail_level = if element_is_from_own_unshared_collection
                              10
                            else
                              max_detail_level_from_collections || 0
                            end
  end

  # The ElementPermissionProxy only calculated nested detail levels for Sample. Wellplate and ResearchPlan,
  # so Element, Reaction and Screen are omitted here. If they are needed in the future, they can be easily
  # implemented here as well
  def calculate_nested_detail_levels
    all_collections_detail_levels = user_collection_detail_levels + sync_collection_detail_levels
    nested_detail_levels[:wellplate] = all_collections_detail_levels.pluck(:wellplate_detail_level).max || 0
    nested_detail_levels[:sample] = all_collections_detail_levels.pluck(:sample_detail_level).max || 0
    nested_detail_levels[:research_plan] = all_collections_detail_levels.pluck(:researchplan_detail_level).max || 0

    nested_detail_levels[:sample] = element_detail_level if element.is_a?(Sample)
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
      SyncCollectionsUser.where(
        user_id: user_ids,
        collection_id: element.collections.ids
      )
  end

  # Returns an array of Hashes. One hash per collection from user_collections_with_element.
  # Hash contains the all detail level attributes and their respective values + the is_shared field
  def user_collection_detail_levels
    attributes_to_fetch = [:is_shared] + DETAIL_LEVEL_FIELDS
    @user_collection_detail_levels ||= user_collections_with_element
                                       .pluck(*attributes_to_fetch)
                                       .map { |values| Hash[ attributes_to_fetch.zip(values) ] }
  end

  # Returns an array of Hashes. One hash per collection from sync_collections_with_element.
  # Hash contains the all detail level attributes and their respective values
  def sync_collection_detail_levels
    attributes_to_fetch = DETAIL_LEVEL_FIELDS
    @sync_collection_detail_levels ||= sync_collections_with_element
                                       .pluck(*attributes_to_fetch)
                                       .map { |attributes| Hash[ attributes_to_fetch.zip(values) ] }
  end
end
