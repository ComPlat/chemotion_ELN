# frozen_string_literal: true

module CollectionHelpers
  extend Grape::API::Helpers

  def writable_collection_for(collection_id)
    return nil if collection_id.blank?

    Collection.writable_by(current_user).find_by(id: collection_id)
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
