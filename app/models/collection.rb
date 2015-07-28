class Collection < ActiveRecord::Base
  belongs_to :user
  has_ancestry
end
