module SyncHelpers
  extend Grape::API::Helpers

  # desc: return the id of the source collection only if
  #  if current_user is associated to it (owned or shared)
  #  or to the sync_collections_user
  def fetch_collection_id_w_current_user(id, is_sync = false)
    if is_sync
      SyncCollectionsUser.find_by(
        id: id.to_i, user_id: current_user.id
      )&.collection_id
    else
      Collection.find_by(
        id: id.to_i, user_id: current_user.id
      )&.id
    end
  end
end
