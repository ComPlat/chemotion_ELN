class MoleculeName < ActiveRecord::Base
  acts_as_paranoid

  belongs_to :user
  belongs_to :molecule

  has_many :samples
end
