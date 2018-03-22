class SyncCollectionsUser < ActiveRecord::Base
  belongs_to :user
  belongs_to :collection
  belongs_to :sharer, foreign_key: :shared_by_id, class_name: 'User'

  has_many :samples, through: :collection
  has_many :reactions, through: :collection
  has_many :wellplates, through: :collection
  has_many :screens, through: :collection
  has_many :research_plans, through: :collection

  before_create :auto_set_synchronized_flag
  after_destroy :check_collection_if_synced

  private

  def auto_set_synchronized_flag
    if self.collection.present?
      self.collection.update_attribute(:is_synchronized, true)
    end
  end

  def check_collection_if_synced
    if collection = self.collection
      unless collection.sync_collections_users.count > 0
        collection.update_attribute(:is_synchronized, false)
      end
    end
  end
end
