# frozen_string_literal: true

module CollectionHelpers
  extend Grape::API::Helpers

  # Appended to a list endpoint's `desc` wherever detail levels are resolved once per page
  # (see ElementDetailLevelCalculator) — defined once so the 7 call sites don't each repeat it.
  LIST_DETAIL_LEVEL_DESC_NOTE =
    'Detail level is applied per collection share; each entry is only partially serialized ' \
    'compared to fetching the element by id directly.'

  def writable_collection_for(collection_id)
    return nil if collection_id.blank?

    Collection.writable_by(current_user).find_by(id: collection_id)
  end

  def readable_collection_for(collection_id)
    return nil if collection_id.blank?

    Collection.accessible_for(current_user).find_by(id: collection_id)
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
