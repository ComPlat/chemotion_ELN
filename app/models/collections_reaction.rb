class CollectionsReaction < ActiveRecord::Base
  belongs_to :collection
  belongs_to :reaction
end
