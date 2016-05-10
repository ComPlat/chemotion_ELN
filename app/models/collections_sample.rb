class CollectionsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sample
  validates :collection, :sample, presence: true
end
