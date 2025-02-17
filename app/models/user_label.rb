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

  def self.my_labels(current_user)
    UserLabel.where('(user_id = ? AND access_level = 0) OR access_level in (1, 2)', current_user.id)
             .order('access_level desc, position, title')
  end
end
