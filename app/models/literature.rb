class Literature < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :reaction
end
