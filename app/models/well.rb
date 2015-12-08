class Well < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :wellplate
  belongs_to :sample
end
