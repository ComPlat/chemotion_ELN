# frozen_string_literal: true

class ElementDetailLevelCalculator
  attr_reader :user, :element, :detail_levels

  # Class per key suffix — the values can't be derived mechanically from the key names
  # (e.g. "researchplan" doesn't classify to ResearchPlan, "element" doesn't namespace to
  # Labimotion::Element), so this mapping must stay hand-written.
  CLASS_BY_KEY_SUFFIX = {
    'sample' => Sample,
    'reaction' => Reaction,
    'wellplate' => Wellplate,
    'screen' => Screen,
    'researchplan' => ResearchPlan,
    'element' => Labimotion::Element,
    'celllinesample' => CelllineSample,
    'devicedescription' => DeviceDescription,
    'sequencebasedmacromoleculesample' => SequenceBasedMacromoleculeSample,
  }.freeze
  private_constant :CLASS_BY_KEY_SUFFIX

  # Maps each of Collection::DETAIL_LEVEL_KEYS (minus :permission_level, which has no
  # class-keyed analog) to the element class {#calculate_detail_levels} keys its hash by.
  # Single-sourced from Collection::DETAIL_LEVEL_KEYS so a future key added there with no
  # matching entry here raises at class-load time instead of silently resolving to 0 at
  # request time (see {.class_hash_for}).
  CLASS_BY_DETAIL_KEY = (Collection::DETAIL_LEVEL_KEYS - [:permission_level]).index_with do |key|
    CLASS_BY_KEY_SUFFIX.fetch(key.to_s.delete_suffix('_detail_level'))
  end.freeze

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
  # +owned_only+ has no default: every call site's "All" (no collection_id) branch must
  # declare, at the call site, that its scope is owner-only (never anything reachable only
  # via a CollectionShare) — {.owned_levels} is only correct under that assumption, and this
  # makes it a required, reviewable claim instead of a silent one. There is deliberately no
  # "owned_only: false" behavior; nothing in this codebase has an "All" branch that isn't
  # owner-only today, so this is an explicit assertion, not a real toggle.
  #
  # @param collection [Collection, nil] the resolved collection, or nil for the "All" view
  # @param user [User]
  # @param owned_only [Boolean] must be true — asserts the nil-collection branch's scope is owner-only
  # @raise [ArgumentError] if +collection+ is nil and +owned_only+ is not true
  # @return [Hash{Class => Integer}]
  def self.for_list(collection:, user:, owned_only:)
    return for_collection(collection: collection, user: user) if collection

    raise ArgumentError, 'the "All" (no collection_id) branch must be owner-only' unless owned_only

    owned_levels
  end

  def self.class_hash_for(key_hash)
    hash = CLASS_BY_DETAIL_KEY.each_with_object({}) { |(key, klass), acc| acc[klass] = key_hash[key] || 0 }
    hash[Well] = hash[Wellplate]
    hash
  end
  private_class_method :class_hash_for

  private

  def calculate_detail_levels
    detail_levels = CLASS_BY_DETAIL_KEY.each_with_object(Hash.new(0)) do |(key, klass), acc|
      acc[klass] = detail_level_for(key) || 0
    end
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
