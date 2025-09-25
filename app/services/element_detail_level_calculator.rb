# frozen_string_literal: true

# rubocop:disable Metrics/CyclomaticComplexity
class ElementDetailLevelCalculator
  attr_reader :user, :element, :detail_levels

  def initialize(user:, element:)
    @user = user
    @element = element
    @detail_levels = calculate_detail_levels
  end

  private

  def calculate_detail_levels # rubocop:disable Metrics/AbcSize, Metrics/PerceivedComplexity
    detail_levels = Hash.new(0)

    detail_levels[Labimotion::Element] = detail_level_for(:element_detail_level) || 0
    detail_levels[Reaction] = detail_level_for(:reaction_detail_level) || 0
    detail_levels[ResearchPlan] = detail_level_for(:researchplan_detail_level) || 0
    detail_levels[Sample] = detail_level_for(:sample_detail_level) || 0
    detail_levels[Screen] = detail_level_for(:screen_detail_level) || 0
    detail_levels[Wellplate] = detail_level_for(:wellplate_detail_level) || 0
    detail_levels[CelllineSample] = detail_level_for(:celllinesample_detail_level) || 0
    detail_levels[DeviceDescription] = detail_level_for(:devicedescription_detail_level) || 0
    detail_levels[SequenceBasedMacromoleculeSample] =
      detail_level_for(:sequencebasedmacromoleculesample_detail_level) || 0
    detail_levels[Well] = detail_levels[Wellplate]

    detail_levels
  end

  # taken from API#group_ids
  def user_ids
    @user_ids ||= user.group_ids + [user.id]
  end

  def detail_level_for(key)
    if user_collections_with_element.any?
      10 # full access for all elements within own collections
    elsif shared_collections_with_element.any?
      shared_collections_with_element.maximum(key) || 0
    else
      0
    end
  end

  # All collections containing the element that belong to the user or were shared to them
  def user_collections_with_element
    @user_collections_with_element ||= element.collections.where(user_id: user_ids)
  end

  # All collections containing the element that were synced to the current user
  def shared_collections_with_element
    @shared_collections_with_element ||= element.collections.shared_collections_for(user)
  end
end
# rubocop:enable Metrics/CyclomaticComplexity Metrics/PerceivedComplexity
