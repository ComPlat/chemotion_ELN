class CollectionsSample < ActiveRecord::Base
  belongs_to :collection
  belongs_to :sample
end
