class CollectionsScreen < ActiveRecord::Base
  belongs_to :collection
  belongs_to :screen
end
