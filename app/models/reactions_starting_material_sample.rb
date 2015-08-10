class ReactionsStartingMaterialSample < ActiveRecord::Base
  belongs_to :reaction
  belongs_to :sample
end
