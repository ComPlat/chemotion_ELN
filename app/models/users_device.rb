class UsersDevice < ActiveRecord::Base
  belongs_to :user
  belongs_to :device
end
