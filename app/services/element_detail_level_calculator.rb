# frozen_string_literal: true

# rubocop:disable Metrics/CyclomaticComplexity
class ElementDetailLevelCalculator
  attr_reader :user, :element, :detail_levels

  # Maps each of Collection::DETAIL_LEVEL_KEYS (minus :permission_level, which has no
  # class-keyed analog) to the element class {#calculate_detail_levels} keys its hash by.
  CLASS_BY_DETAIL_KEY = {
    sample_detail_level: Sample,
    reaction_detail_level: Reaction,
    wellplate_detail_level: Wellplate,
    screen_detail_level: Screen,
    researchplan_detail_level: ResearchPlan,
    element_detail_level: Labimotion::Element,
    celllinesample_detail_level: CelllineSample,
    devicedescription_detail_level: DeviceDescription,
    sequencebasedmacromoleculesample_detail_level: SequenceBasedMacromoleculeSample,
  }.freeze

  def initialize(user:, element:)
    @user = user
    @element = element
    @detail_levels = calculate_detail_levels
  end

  # Class-keyed detail levels for every element on a page fetched via a single +collection+ —
  # one query (or zero, if +collection+ is owned) instead of one {ElementDetailLevelCalculator}
  # per element. Intended for list/index endpoints where every element on the page is known to
  # come from exactly one resolved collection.
  #
  # This does not check any *other* collection an element might also belong to (the per-element
  # instance method does); an element that's also independently owned or better-shared elsewhere
  # will show the browsed collection's level here, not its best available level. Acceptable for a
  # summary list — opening the individual element re-resolves the accurate value.
  #
  # @param collection [Collection] the single collection the current page was fetched from
  # @param user [User]
  # @return [Hash{Class => Integer}]
  def self.for_collection(collection:, user:)
    class_hash_for(collection.detail_levels_for_user(user))
  end

  # Class-keyed detail levels for a page drawn only from collections the user owns (the
  # "no collection_id" / merged view) — always full access, with zero queries.
  #
  # @return [Hash{Class => Integer}]
  def self.owned_levels
    class_hash_for(Collection::DETAIL_LEVEL_KEYS.index_with { Collection::OWNER_LEVEL })
  end

  # Class-keyed detail levels for a list/index page, given the possibly-nil collection
  # resolved from an optional +collection_id+ param. Combines {.for_collection} and
  # {.owned_levels} — the branch every list endpoint needs to pick between them.
  #
  # @param collection [Collection, nil] the resolved collection, or nil for the "All" view
  # @param user [User]
  # @return [Hash{Class => Integer}]
  def self.for_list(collection:, user:)
    collection ? for_collection(collection: collection, user: user) : owned_levels
  end

  def self.class_hash_for(key_hash)
    hash = CLASS_BY_DETAIL_KEY.each_with_object({}) { |(key, klass), acc| acc[klass] = key_hash[key] || 0 }
    hash[Well] = hash[Wellplate]
    hash
  end
  private_class_method :class_hash_for

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
