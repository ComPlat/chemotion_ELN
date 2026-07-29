# frozen_string_literal: true

module CollectionHelpers
  extend Grape::API::Helpers

  # Appended to a list endpoint's +desc+ wherever detail levels are resolved once per page
  # (see ElementDetailLevelCalculator) — defined once so the 7 call sites don't each repeat it.
  LIST_DETAIL_LEVEL_DESC_NOTE =
    'Detail level is applied per collection share; each entry is only partially serialized ' \
    'compared to fetching the element by id directly.'

  def writable_collection_for(collection_id)
    Collection.resolve_for(current_user, collection_id, scope: :writable_by)
  end

  def readable_collection_for(collection_id)
    Collection.resolve_for(current_user, collection_id, scope: :accessible_for)
  end

  # Resolves a list endpoint's scope: either the +association+ off the collection
  # named by +collection_id+ (or an empty scope if that collection is missing or
  # inaccessible), or every element the current user owns when no +collection_id+
  # is given.
  #
  # @param collection_id [Integer, nil] params[:collection_id]
  # @param klass [Class] the element class — must respond to +.none+ and +.for_user+
  # @param association [Symbol] the {Collection} association to read from (e.g. +:samples+)
  # @return [Array(Collection, ActiveRecord::Relation)] the resolved collection
  #   (nil if none given, or not accessible) and the resulting scope
  def collection_scope_for(collection_id, klass, association)
    resolved_collection = readable_collection_for(collection_id)
    scope = if collection_id
              resolved_collection ? resolved_collection.public_send(association) : klass.none
            else
              klass.for_user(current_user.id).distinct
            end
    [resolved_collection, scope]
  end

  # The once-per-page detail levels for a list endpoint's resolved collection. Every one of the
  # 7 call sites asserted +owned_only: true+ identically (the "All" branch each resolves is
  # always owner-only — see {CollectionHelpers#collection_scope_for}), so sharing the call here
  # removes the repetition without losing that assertion: it's still made in exactly one place,
  # just not copy-pasted seven times.
  #
  # @param resolved_collection [Collection, nil] as returned by {#collection_scope_for}
  # @return [Hash{Class => Integer}]
  def detail_levels_for_list(resolved_collection)
    ElementDetailLevelCalculator.for_list(collection: resolved_collection, user: current_user, owned_only: true)
  end

  def set_var(c_id = params[:collection_id])
    @c = Collection.accessible_for(current_user).find(c_id)
    @c_id = @c.id

    # Group-aware and MAX-based: a collection owned by one of the user's groups is theirs, and a
    # collection reaching them through several shares grants the highest level of each.
    @dl = @c.detail_levels_for_user(current_user)
    @pl = @dl[:permission_level]
    @dl_s = @dl[:sample_detail_level]
    @dl_r = @dl[:reaction_detail_level]
    @dl_wp = @dl[:wellplate_detail_level]
    @dl_sc = @dl[:screen_detail_level]
    @dl_rp = @dl[:researchplan_detail_level]
    @dl_e = @dl[:element_detail_level]
    @dl_cl = @dl[:celllinesample_detail_level]
    @dl_dd = @dl[:devicedescription_detail_level]
    @dl_sbmms = @dl[:sequencebasedmacromoleculesample_detail_level]
  end
end
