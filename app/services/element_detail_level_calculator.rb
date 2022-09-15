class ElementDetailLevelCalculator
  attr_reader :user, :element
  attr_reader :element_detail_level, :nested_detail_levels

  def initialize(user:, element:)
    @user = user
    @element = element
    @nested_detail_levels = {}

    calculate_detail_levels
  end

  private

  # taken from API#group_ids
  def user_ids
    @user_ids ||= user.group_ids.merge(user.id)
  end

  def user_collections_with_element
    @collections_with_element ||= element.collections.where(user_id: user_ids)
  end

  def sync_collections_with_element
    @sync_collections_with_element ||=
      SyncCollectionUsers.where(
        user_id: user_ids,
        collection_id: element.collections.ids
      )
  end

  def calculate_detail_levels
    user_collection_detail_levels = user_collections_with_element.pluck(
      :is_shared,
      :element_detail_level,
      :researchplan_detail_level,
      :sample_detail_level,
      :reaction_detail_level,
      :wellplate_detail_level,
      :screen_detail_level,
    )
    sync_collection_detail_levels = collection_detail_levels = sync_collections_with_element.pluck(
      :element_detail_level,
      :researchplan_detail_level,
      :sample_detail_level,
      :reaction_detail_level,
      :wellplate_detail_level,
      :screen_detail_level,
    )

    calculate_element_detail_level(user_collection_detail_levels, sync_collection_detail_levels)
    calculcate_nested_detail_levels(user_collection_detail_levels + sync_collection_detail_levels)
  end

  def calculate_element_detail_level(user_collection_detail_levels, sync_collection_detail_levels)
    element_detail_level_field = "#{element.class.to_s.downcase}_detail_level".to_sym
    element_is_from_own_unshared_collection = user_collection_detail_levels.any?{ |entry| !entry[:is_shared] }
    max_detail_level_from_collections = [
      user_collection_detail_levels.pluck(element_detail_level_field),
      sync_collection_detail_levels.pluck(element_detail_level_field)
    ].max

    @element_detail_level = if element_is_from_own_unshared_collection
                              10
                            else
                              max_detail_level_from_collections
                            end
  end

  # The ElementPermissionProxy only calculated nested detail levels for Sample. Wellplate and ResearchPlan,
  # so Element, Reaction and Screen are omitted here. If they are needed in the future, they can be easily
  # implemented here as well
  def calculate_nested_detail_levels(all_collections)
    nested_detail_levels[:wellplate] = all_collections.pluck(:wellplate_detail_level).max
    nested_detail_levels[:sample] = all_collections.pluck(:sample_detail_level).max
    nested_detail_levels[:research_plan] = all_collections.pluck(:researchplan_detail_level).max

    if element.is_a?(Sample)
      nested_detail_levels[:sample] = element_detail_level
    end
  end
end
