class SyncCollectionsUser < ActiveRecord::Base
  belongs_to :user
  belongs_to :collection
  belongs_to :sharer, foreign_key: :shared_by_id, class_name: 'User'

  has_many :samples, through: :collection
  has_many :reactions, through: :collection
  has_many :wellplates, through: :collection
  has_many :screens, through: :collection
end
