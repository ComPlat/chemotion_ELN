class Affiliation < ActiveRecord::Base
  has_many :user_affiliations
  has_many :users, through: :user_affiliations, :dependent => :destroy
end

