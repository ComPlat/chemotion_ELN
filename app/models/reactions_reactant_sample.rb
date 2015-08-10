class ReactionsReactantSample < ActiveRecord::Base
  belongs_to :reaction
  belongs_to :sample
end
