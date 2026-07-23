# frozen_string_literal: true

# rubocop:disable Metrics/CyclomaticComplexity
class ElementDetailLevelCalculator
  attr_reader :user, :element, :detail_levels

  # owns_collection_with_element: optional pre-computed boolean (from
  # .owned_element_ids) to avoid a per-element existence query when the
  # caller already knows, for a batch of elements, whether each one
  # belongs to a collection owned by the user.
  def initialize(user:, element:, owns_collection_with_element: nil)
    @user = user
    @element = element
    @owns_collection_with_element = owns_collection_with_element
    @detail_levels = calculate_detail_levels
  end

  # Batch-computes, in a single query, which of the given elements belong to a
  # collection owned by the user (or one of the user's groups). Intended to
  # replace the per-element `user_collections_with_element.any?` check when
  # calculating detail levels for a whole page of elements.
  #
  # Returns a Set of element ids.
  def self.owned_element_ids(elements:, user:)
    elements = elements.to_a
    return Set.new if elements.empty?

    klass = elements.first.class
    user_ids = user.group_ids + [user.id]

    klass
      .joins(:collections)
      .where(collections: { user_id: user_ids })
      .where(id: elements.map(&:id))
      .distinct
      .pluck(:id)
      .to_set
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
    if owns_collection_with_element?
      10 # full access for all elements within own collections
    elsif shared_collections_with_element.any?
      shared_collections_with_element.maximum(key) || 0
    else
      0
    end
  end

  def owns_collection_with_element?
    return @owns_collection_with_element unless @owns_collection_with_element.nil?

    @owns_collection_with_element = user_collections_with_element.any?
  end

  # All collections containing the element that belong to the user
  def user_collections_with_element
    @user_collections_with_element ||= element.collections.where(user_id: user_ids)
  end

  # All collections containing the element that were shared with the current user
  def shared_collections_with_element
    @shared_collections_with_element ||= element.collections.shared_collections_for(user)
  end
end
# rubocop:enable Metrics/CyclomaticComplexity Metrics/PerceivedComplexity
