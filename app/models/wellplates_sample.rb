class WellplatesSample < ActiveRecord::Base
  belongs_to :wellplate
  belongs_to :sample
end
