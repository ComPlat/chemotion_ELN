module Collectable
  extend ActiveSupport::Concern

  included do
    scope :for_user, ->(user_id) { joins(:collections).where('collections.user_id = ?', user_id).references(:collections) }
    scope :for_user_n_groups, ->(user_ids) { joins(:collections).where('collections.user_id IN (?)', user_ids).references(:collections) }
    #joins(:shared_collections_users).where('sync_collections_users.user_id IN (?)', user_ids ).references(:sync_collections_users)
    #Sample.joins(:collections,:shared_collections_users).where('collections.user_id IN (?) OR sync_collections_users.user_id in (?)', [user_id]+Person.find(user_id).group_ids,[user_id]+Person.find(user_id).group_ids).references(:collections,:sync_collections_users).uniq
    scope :by_collection_id, ->(id) { joins(:collections).where('collections.id = ?', id) }
    scope :search_by, ->(search_by_method, arg) { public_send("search_by_#{search_by_method}", arg) }
  end
end
