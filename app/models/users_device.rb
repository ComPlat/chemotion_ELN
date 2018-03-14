class UsersDevice < ActiveRecord::Base
  belongs_to :user
  belongs_to :device

  scope :by_user_ids, ->(ids) { where(user_id: ids) }
end
