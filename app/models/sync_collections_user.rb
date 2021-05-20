# == Schema Information
#
# Table name: sync_collections_users
#
#  id                        :integer          not null, primary key
#  user_id                   :integer
#  collection_id             :integer
#  shared_by_id              :integer
#  permission_level          :integer          default(0)
#  sample_detail_level       :integer          default(0)
#  reaction_detail_level     :integer          default(0)
#  wellplate_detail_level    :integer          default(0)
#  screen_detail_level       :integer          default(0)
#  fake_ancestry             :string
#  researchplan_detail_level :integer          default(10)
#  label                     :string
#  created_at                :datetime
#  updated_at                :datetime
#  element_detail_level      :integer          default(10)
#
# Indexes
#
#  index_sync_collections_users_on_collection_id              (collection_id)
#  index_sync_collections_users_on_shared_by_id               (shared_by_id,user_id,fake_ancestry)
#  index_sync_collections_users_on_user_id_and_fake_ancestry  (user_id,fake_ancestry)
#

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
