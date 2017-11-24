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
      Collection.find_by(
        id: id.to_i, user_id: user_ids
      )&.id
    end.to_i
  end

  # desc: given an id of coll or sync coll return detail levels as array
  def permission_level_for_collection(id, is_sync = false)
    (is_sync && SyncCollectionsUser || Collection).find_by(
      id: id.to_i, user_id: user_ids
    )&.slice(
      :sample_detail_level, :reaction_detail_level,
      :wellplate_detail_level, :screen_detail_level
    ) || {
      sample_detail_level: 0,
      reaction_detail_level: 0,
      wellplate_detail_level: 0,
      screen_detail_level: 0
    }
  end

  # desc: return a collection id to which elements (eg samples) shld be assigned
  # if current user is entitled to write into the destination collection
  def fetch_collection_id_for_assign(prms)
    c_id = prms[:collection_id]
    # create a new collection to assign to
    if !prms[:newCollection].blank?
      Collection.create(
        user_id: current_user.id, label: prms[:newCollection]
      )&.id
    # find a sync collection, check its permissions, find the asso collection
    elsif prms[:is_sync_to_me]
      sync_coll_user = SyncCollectionsUser.find_by(id: c_id)
      accessible = sync_coll_user && user_ids.include?(sync_coll_user.user_id)
      writable = sync_coll_user && sync_coll_user.permission_level >= 1
      accessible && writable && sync_coll_user.collection_id
    # find a collec id either owned by or shared to (with pl >=1) current_user
    elsif (col = Collection.find_by(id: c_id, user_id: user_ids))
      (!col.is_shared || col.permission_level >= 1) && col.id
    # find a collect id that is shared_by current_user
    elsif (col = Collection.find_by(id: c_id, shared_by_id: current_user.id))
      col.id
    end
  end
end
