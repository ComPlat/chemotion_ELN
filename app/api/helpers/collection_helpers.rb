module CollectionHelpers
  extend Grape::API::Helpers

  # desc: return the id of the source collection only if
  #  if current_user is associated to it (owned or shared)
  #  or to the sync_collections_user
  # return 0 if no association
  def fetch_collection_id_w_current_user(id, is_sync = false)
    if is_sync
      SyncCollectionsUser.find_by(
        id: id.to_i, user_id: user_ids
      )&.collection_id
    else
      (Collection.find_by(id: id.to_i, user_id: user_ids) ||
        Collection.find_by(id: id.to_i, shared_by_id: current_user.id))&.id
    end.to_i
  end

  def fetch_collection_w_current_user(id, is_sync = false)
    if is_sync
      SyncCollectionsUser.find_by(id: id.to_i, user_id: user_ids)
    else
      Collection.find_by(id: id.to_i, user_id: user_ids) ||
        Collection.find_by(id: id.to_i, shared_by_id: current_user.id)
    end
  end

  # desc: given an id of coll or sync coll return detail levels as array
  def detail_level_for_collection(id, is_sync = false)
    dl = (is_sync && SyncCollectionsUser || Collection).find_by(
      id: id.to_i, user_id: user_ids
    )&.slice(
      :permission_level,
      :sample_detail_level, :reaction_detail_level,
      :wellplate_detail_level, :screen_detail_level,
      :researchplan_detail_level
    )&.symbolize_keys
    {
      permission_level: 0,
      sample_detail_level: 0,
      reaction_detail_level: 0,
      wellplate_detail_level: 0,
      screen_detail_level: 0,
      researchplan_detail_level: 0,
    }.merge(dl || {})
  end

  # TODO: DRY fetch_collection_id_for_assign & fetch_collection_by_ui_state_params_and_pl
  # desc: return a collection id to which elements (eg samples) shld be assigned
  # if current user is entitled to write into the destination collection
  def fetch_collection_id_for_assign(prms = params, pl = 1)
    c_id = prms[:collection_id]
    if !prms[:newCollection].blank?
      c = Collection.create(
        user_id: current_user.id, label: prms[:newCollection]
      )
    elsif prms[:is_sync_to_me]
      c = Collection.joins(:sync_collections_users).where(
        'sync_collections_users.id = ? and sync_collections_users.user_id in (?) and sync_collections_users.permission_level >= ?',
        c_id,
        user_ids,
        pl
      ).first
    elsif
      c = Collection.where(id: c_id).where(
        'shared_by_id = ? OR (user_id in (?) AND (is_shared IS NOT TRUE OR permission_level >= ?))',
        current_user.id,
        user_ids,
        pl
      ).first
    end
    c&.id
  end

  def fetch_collection_by_ui_state_params_and_pl(pl = 2)
    current_collection = params['ui_state']['currentCollection']
    @collection = if current_collection['is_sync_to_me']
      Collection.joins(:sync_collections_users).where(
        'sync_collections_users.id = ? and sync_collections_users.user_id in (?) and sync_collections_users.permission_level >= ?',
        current_collection['id'],
        user_ids,
        pl
      ).first
    else
      Collection.where(
        'id = ? AND ((user_id in (?) AND (is_shared IS NOT TRUE OR permission_level >= ?)) OR shared_by_id = ?)',
        current_collection['id'],
        user_ids,
        pl,
        current_user
      ).first
    end
    @collection
  end

  def fetch_source_collection_for_removal
    fetch_collection_by_ui_state_params_and_pl(3)
  end

  def fetch_source_collection_for_assign
    fetch_collection_by_ui_state_params_and_pl(2)
  end

  def set_var(c_id = params[:collection_id], is_sync = params[:is_sync])
    @c_id = fetch_collection_id_w_current_user(c_id, is_sync)
    @c = Collection.find_by(id: @c_id)
    cu_id = current_user&.id
    @is_owned = cu_id && ((@c.user_id == cu_id && !@c.is_shared) || @c.shared_by_id == cu_id)

    @dl = {
      permission_level: 10,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      researchplan_detail_level: 10,
    }

    @dl = detail_level_for_collection(c_id, is_sync) unless @is_owned
    @pl = @dl[:permission_level]
    @dl_s = @dl[:sample_detail_level]
    @dl_r = @dl[:reaction_detail_level]
    @dl_wp = @dl[:wellplate_detail_level]
    @dl_sc = @dl[:screen_detail_level]
    @dl_rp = @dl[:researchplan_detail_level]
  end
end
