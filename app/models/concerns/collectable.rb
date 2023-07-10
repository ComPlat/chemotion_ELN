module Collectable
  extend ActiveSupport::Concern

  included do
    scope :for_user, ->(user_id) { joins(:collections).where('collections.user_id = ?', user_id).references(:collections) }
    scope :for_user_n_groups, ->(user_ids) { joins(:collections).where('collections.user_id IN (?)', user_ids).references(:collections) }
    scope :by_collection_id, ->(id) { joins(:collections).where('collections.id = ?', id) }
    scope :search_by, ->(search_by_method, arg) { public_send("search_by_#{search_by_method}", arg) }

    # TODO: Filters are not working properly
    # the following scopes are not working as I would expect
    # in the ui the selection is a date but in the api we are getting a timestamp,
    # which we are parsing whiteout timezone information, so we lose some hours
    # dayjs('2019-01-25').unix() // 1548381600 is Time.at(1548381600) 2019-01-25 03:00:00 +0100
    # I would suggest the following:
    # send date from frontend and use the psql date method: where("date(#{table_name}.created_at) <= ?", date) or
    # remove + 1.day part from created_time_to and updated_time_to scopes and use .end_of_day and
    # use beginning_of_day for the from scopes: where("#{table_name}.created_at >= ?", time.beginning_of_day)
    scope :created_time_to, ->(time) { where("#{table_name}.created_at <= ?", time) }
    scope :created_time_from, ->(time) { where("#{table_name}.created_at >= ?", time) }
    scope :updated_time_to, ->(time) { where("#{table_name}.updated_at <= ?", time) }
    scope :updated_time_from, ->(time) { where("#{table_name}.updated_at >= ?", time) }

    scope :join_collections_element, ->{
      tb = name.underscore
      joins("inner join collections_#{tb}s on #{tb}s.id = collections_#{tb}s.sample_id")
    }
  end
end
