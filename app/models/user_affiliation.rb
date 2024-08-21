# == Schema Information
#
# Table name: user_affiliations
#
#  id             :integer          not null, primary key
#  user_id        :integer
#  affiliation_id :integer
#  created_at     :datetime
#  updated_at     :datetime
#  deleted_at     :datetime
#  from           :date
#  to             :date
#  main           :boolean
#

class UserAffiliation < ApplicationRecord
  acts_as_paranoid
  belongs_to :user
  belongs_to :affiliation


  delegate :country, :organization, :department, :group, to: :affiliation, prefix: false, allow_nil: true
end
