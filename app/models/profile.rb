class Profile < ActiveRecord::Base
  acts_as_paranoid

  belongs_to :user

  scope :novnc, -> { where("\"data\"->>'novnc' is distinct from null") } 
end
