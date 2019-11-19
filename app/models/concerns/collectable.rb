module Collectable
  extend ActiveSupport::Concern

  included do
    scope :for_user, ->(user_id) { joins(:collections).where('collections.user_id = ?', user_id).references(:collections) }
    scope :for_user_n_groups, ->(user_ids) { joins(:collections).where('collections.user_id IN (?)', user_ids).references(:collections) }
    scope :by_collection_id, ->(id) { joins(:collections).where('collections.id = ?', id) }
    scope :search_by, ->(search_by_method, arg) { public_send("search_by_#{search_by_method}", arg) }
    scope :created_time_to, ->(time) { where('created_at <= ?', time) }
    scope :created_time_from, ->(time) { where('created_at >= ?', time) }
    scope :updated_time_to, ->(time) { where('updated_at <= ?', time) }
    scope :updated_time_from, ->(time) { where('updated_at >= ?', time) }
    scope :samples_created_time_from, ->(time) { where('samples.created_at >= ?', time) }
    scope :samples_created_time_to, ->(time) { where('samples.created_at <= ?', time) }
    scope :samples_updated_time_from, ->(time) { where('samples.updated_at >= ?', time) }
    scope :samples_updated_time_to, ->(time) { where('samples.updated_at <= ?', time) }
    scope :join_collections_element, ->{
      tb = name.underscore
      joins("inner join collections_#{tb}s on #{tb}s.id = collections_#{tb}s.sample_id")
    }
  end
end
