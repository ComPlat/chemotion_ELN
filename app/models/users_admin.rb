class UsersAdmin < ActiveRecord::Base
  belongs_to :user
  belongs_to :admin, class_name: "Person"
end
