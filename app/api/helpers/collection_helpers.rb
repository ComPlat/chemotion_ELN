# frozen_string_literal: true

module CollectionHelpers
  extend Grape::API::Helpers

  def detail_levels_for_shared_collection(collection)
    collection_share = CollectionShare.find_by(collection: collection, shared_with: current_user)

    # this needs adjustment when detail levels for new elements are introduced
    defaults = {
      permission_level: 0,
      sample_detail_level: 0,
      reaction_detail_level: 0,
      wellplate_detail_level: 0,
      screen_detail_level: 0,
      researchplan_detail_level: 0,
      element_detail_level: 0,
      celllinesample_detail_level: 0,
      devicedescription_detail_level: 0,
      sequencebasedmacromoleculesample_detail_level: 0,
    }

    return defaults unless collection_share

    collection_share.attributes.symbolize_keys.slice(*defaults.keys)
  end

  # TODO: improve this code and its callers by refactoring this logic into a method on collection
  #       example: Collection.find(ID).detail_levels_for_user(user)
  def set_var(c_id = params[:collection_id])
    @c = Collection.accessible_for(current_user).find(c_id)
    @c_id = @c.id

    @dl = {
      permission_level: 10,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      researchplan_detail_level: 10,
      element_detail_level: 10,
      celllinesample_detail_level: 10,
      devicedescription_detail_level: 10,
      sequencebasedmacromoleculesample_detail_level: 10,
    }

    @dl = detail_levels_for_shared_collection(@c) if @c.user != current_user
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
