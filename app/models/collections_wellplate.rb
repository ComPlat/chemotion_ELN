class CollectionsWellplate < ActiveRecord::Base
  belongs_to :collection
  belongs_to :wellplate
end
