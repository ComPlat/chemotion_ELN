class Well < ActiveRecord::Base
  belongs_to :wellplate
  belongs_to :sample
end
