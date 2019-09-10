# == Schema Information
#
# Table name: users_groups
#
#  id       :integer          not null, primary key
#  user_id  :integer
#  group_id :integer
#
# Indexes
#
#  index_users_groups_on_group_id  (group_id)
#  index_users_groups_on_user_id   (user_id)
#

class UsersGroup < ActiveRecord::Base
  belongs_to :user
  belongs_to :group
end
