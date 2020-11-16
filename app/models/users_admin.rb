# == Schema Information
#
# Table name: users_admins
#
#  id       :integer          not null, primary key
#  user_id  :integer
#  admin_id :integer
#
# Indexes
#
#  index_users_admins_on_admin_id  (admin_id)
#  index_users_admins_on_user_id   (user_id)
#

class UsersAdmin < ApplicationRecord
  belongs_to :user
  belongs_to :admin, class_name: "Person"
end
