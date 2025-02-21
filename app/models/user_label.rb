# == Schema Information
#
# Table name: user_labels
#
#  id           :integer          not null, primary key
#  user_id      :integer
#  title        :string           not null
#  description  :string
#  color        :string           not null
#  access_level :integer          default(0)
#  position     :integer          default(10)
#  created_at   :datetime
#  updated_at   :datetime
#  deleted_at   :datetime
#

class UserLabel < ApplicationRecord
  acts_as_paranoid

  # Scope to fetch labels accessible to a specific user.
  #
  # A user can see:
  # - Their own labels (`access_level = 0`)
  # - Labels with `access_level` of 1 or 2 (shared/global labels)
  #
  # @param user [User] The user for whom to fetch labels.
  # @return [ActiveRecord::Relation] The filtered and ordered user labels.
  scope :my_labels, lambda { |user|
    where('(user_id = ? AND access_level = 0) OR access_level IN (1, 2)', user.id)
      .order(access_level: :desc, position: :asc, title: :asc)
  }
end
