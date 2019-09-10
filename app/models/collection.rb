# == Schema Information
#
# Table name: collections
#
#  id                        :integer          not null, primary key
#  user_id                   :integer          not null
#  ancestry                  :string
#  label                     :text             not null
#  shared_by_id              :integer
#  is_shared                 :boolean          default(FALSE)
#  permission_level          :integer          default(0)
#  sample_detail_level       :integer          default(10)
#  reaction_detail_level     :integer          default(10)
#  wellplate_detail_level    :integer          default(10)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  position                  :integer
#  screen_detail_level       :integer          default(10)
#  is_locked                 :boolean          default(FALSE)
#  deleted_at                :datetime
#  is_synchronized           :boolean          default(FALSE), not null
#  researchplan_detail_level :integer          default(10)
#
# Indexes
#
#  index_collections_on_ancestry    (ancestry)
#  index_collections_on_deleted_at  (deleted_at)
#  index_collections_on_user_id     (user_id)
#

class Collection < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :user
  has_ancestry

  has_many :collections_samples, dependent: :destroy
  has_many :collections_reactions, dependent: :destroy
  has_many :collections_wellplates, dependent: :destroy
  has_many :collections_screens, dependent: :destroy
  has_many :collections_research_plans, dependent: :destroy

  has_many :samples, through: :collections_samples
  has_many :reactions, through: :collections_reactions
  has_many :wellplates, through: :collections_wellplates
  has_many :screens, through: :collections_screens
  has_many :research_plans, through: :collections_research_plans

  has_many :sync_collections_users,  foreign_key: :collection_id, dependent: :destroy
  has_many :shared_users, through: :sync_collections_users, source: :user

  # A collection is locked if it is not allowed to rename or rearrange it
  scope :unlocked, -> { where(is_locked: false) }
  scope :locked, -> { where(is_locked: true) }

  scope :ordered, -> { order("position ASC") }
  scope :unshared, -> { where(is_shared: false) }
  scope :shared, ->(user_id) { where('shared_by_id = ? AND is_shared = ?', user_id, true) }
  scope :remote, ->(user_id) { where('is_shared = ? AND NOT shared_by_id = ?', true, user_id) }
  scope :belongs_to_or_shared_by, ->(user_id, with_group = false) do
    if with_group && !with_group.empty?
      where("user_id = ? OR shared_by_id = ? OR (user_id IN (?) AND is_locked = false)",
        user_id, user_id, with_group)
    else
      where("user_id = ? OR shared_by_id = ?", user_id, user_id)
    end
  end

  default_scope { ordered }

  def self.get_all_collection_for_user(user_id)
    find_by(user_id: user_id, label: 'All', is_locked: true)
  end

  def self.bulk_update(user_id, collection_attributes, deleted_ids)
    ActiveRecord::Base.transaction do
      update_or_create(user_id, collection_attributes)
      update_parent_child_associations(user_id, collection_attributes)
      delete_set(user_id, deleted_ids)
    end
  end

  private
  def self.filter_collection_attributes(user_id, collection_attributes)
    c_ids = collection_attributes.map {|ca| !ca['isNew'] && ca['id'].to_i || nil}.compact
    filtered_cids = Collection.where(id: c_ids).map do |c|
      if (c.user_id == user_id && !c.is_shared) || (c.is_shared &&
        (c.shared_by_id == user_id || (c.user_id == user_id &&
        permission_level == 10)))
        c.id
      else
       nil
      end
    end.compact
    collection_attributes.select {|ca| ca['isNew'] || filtered_cids.include?(ca['id'].to_i)}
  end

  def self.update_or_create(user_id, collection_attributes, position=0)
    return unless collection_attributes && user_id.is_a?(Integer)
    filter_collection_attributes(user_id, collection_attributes).each do |attr|
      position += 1
      if(attr['isNew'])
        collection = create({label: attr['label'], user_id: user_id, position: position})
        attr['id'] = collection.id
      else
        collection = find(attr['id']).update({label: attr['label'], position: position})
      end
      update_or_create(user_id, attr['children'], position + 1)
    end
  end

  def self.update_parent_child_associations(user_id, collection_attributes, grand_parent=nil)
    return unless collection_attributes && user_id.is_a?(Integer)

    filter_collection_attributes(user_id, collection_attributes).each do |attr|
      parent = Collection.find(attr['id'])

      # collection is a new root collection
      unless(grand_parent)
        parent.update(parent: nil)
      end

      if(attr['children'])
        filter_collection_attributes(user_id, attr['children']).each do |attr_child|
          child = Collection.find(attr_child['id'])
          child.update(parent: parent)
        end
      end

      update_parent_child_associations(user_id, attr['children'], parent)
    end
  end

  def self.delete_set(user_id, deleted_ids)
    (
      Collection.where(id: deleted_ids, user_id: user_id) |
      Collection.where(id: deleted_ids, shared_by_id: user_id)
    ).each { |c| c.destroy }
  end

  def self.reject_shared(user_id, collection_id)
    (
      Collection.where(id: collection_id, user_id: user_id, is_shared: true)
    ).each { |c| c.destroy }
  end
end
