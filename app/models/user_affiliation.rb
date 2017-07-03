class UserAffiliation < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :user
  belongs_to :affiliation
end
