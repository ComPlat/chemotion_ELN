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

class UsersGroup < ApplicationRecord
  belongs_to :user
  belongs_to :group

  after_create :update_user_matrix

  def update_user_matrix
    user = User.find_by(id: self.user_id)
    user.update_matrix unless user.nil?
  end
end
