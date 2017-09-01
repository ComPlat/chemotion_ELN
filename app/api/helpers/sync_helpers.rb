module SyncHelpers
  extend Grape::API::Helpers
  
  # desc: return the id of the associated collection if given id is from
  #  a SyncCollectionsUser
  def fetch_collection_id(id, is_sync = false)
    if is_sync
      SyncCollectionsUser.find_by(
        id: id.to_i, user_id: current_user.id
      )&.collection_id
    else
      id.to_i
    end
  end
end
