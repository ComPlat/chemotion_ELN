# frozen_string_literal: true

# rubocop:disable Metrics/AbcSize, Rails/HasManyOrHasOneDependent, Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity

# == Schema Information
#
# Table name: collections
#
#  id                                            :integer          not null, primary key
#  ancestry                                      :string           default("/"), not null
#  celllinesample_detail_level                   :integer          default(10)
#  deleted_at                                    :datetime
#  devicedescription_detail_level                :integer          default(10)
#  element_detail_level                          :integer          default(10)
#  is_locked                                     :boolean          default(FALSE)
#  is_shared                                     :boolean          default(FALSE)
#  is_synchronized                               :boolean          default(FALSE), not null
#  label                                         :text             not null
#  permission_level                              :integer          default(0)
#  position                                      :integer
#  reaction_detail_level                         :integer          default(10)
#  researchplan_detail_level                     :integer          default(10)
#  sample_detail_level                           :integer          default(10)
#  screen_detail_level                           :integer          default(10)
#  sequencebasedmacromoleculesample_detail_level :integer          default(10)
#  tabs_segment                                  :jsonb
#  wellplate_detail_level                        :integer          default(10)
#  created_at                                    :datetime         not null
#  updated_at                                    :datetime         not null
#  inventory_id                                  :bigint
#  shared_by_id                                  :integer
#  user_id                                       :integer          not null
#
# Indexes
#
#  index_collections_on_ancestry      (ancestry) WHERE (deleted_at IS NULL)
#  index_collections_on_deleted_at    (deleted_at)
#  index_collections_on_inventory_id  (inventory_id)
#  index_collections_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (inventory_id => inventories.id)
#

class Collection < ApplicationRecord
  acts_as_paranoid
  belongs_to :user, optional: true
  belongs_to :inventory, optional: true
  has_ancestry

  has_many :collections_samples, dependent: :destroy
  has_many :collections_reactions, dependent: :destroy
  has_many :collections_wellplates, dependent: :destroy
  has_many :collections_screens, dependent: :destroy
  has_many :collections_research_plans, dependent: :destroy
  has_many :collections_device_descriptions, dependent: :destroy
  has_many :collections_elements, dependent: :destroy, class_name: 'Labimotion::CollectionsElement'
  has_many :collections_vessels, dependent: :destroy
  has_many :collections_celllines, dependent: :destroy
  has_many :collections_sequence_based_macromolecule_samples, dependent: :destroy
  has_many :samples, through: :collections_samples
  has_many :reactions, through: :collections_reactions
  has_many :wellplates, through: :collections_wellplates
  has_many :screens, through: :collections_screens
  has_many :research_plans, through: :collections_research_plans
  has_many :vessels, through: :collections_vessels
  has_many :device_descriptions, through: :collections_device_descriptions
  has_many :elements, through: :collections_elements
  has_many :cellline_samples, through: :collections_celllines
  has_many :sequence_based_macromolecule_samples, through: :collections_sequence_based_macromolecule_samples

  has_many :sync_collections_users, dependent: :destroy, inverse_of: :collection
  has_many :shared_users, through: :sync_collections_users, source: :user

  has_one :metadata

  delegate :prefix, :name, to: :inventory, allow_nil: true, prefix: :inventory

  # A collection is locked if it is not allowed to rename or rearrange it
  scope :unlocked, -> { where(is_locked: false) }
  scope :locked, -> { where(is_locked: true) }

  scope :ordered, -> { order('position ASC') }
  scope :unshared, -> { where(is_shared: false) }
  scope :synchronized, -> { where(is_synchronized: true) }
  scope :shared, ->(user_id) { where('shared_by_id = ? AND is_shared = ?', user_id, true) }
  scope :remote, ->(user_id) { where('is_shared = ? AND NOT shared_by_id = ?', true, user_id) }
  scope :belongs_to_or_shared_by, lambda { |user_id, with_group = false|
    if with_group.present?
      where(
        'user_id = ? OR shared_by_id = ? OR (user_id IN (?) AND is_locked = false)',
        user_id, user_id, with_group
      )
    else
      where('user_id = ? OR shared_by_id = ?', user_id, user_id)
    end
  }

  default_scope { ordered }
  SQL_INVENT_JOIN = 'LEFT JOIN ' \
                    'inventories  ' \
                    'ON collections.inventory_id = inventories.id'
  SQL_INVENT_SELECT = 'inventory_id,' \
                      'row_to_json(inventories) AS inventory,' \
                      'JSON_AGG(collections) AS collections'
  SQL_INVENT_FROM = '(select c.id,c."label",c.inventory_id,c.deleted_at,' \
                    'c.is_locked,c.is_shared,c.user_id from collections c) collections'

  # group by inventory_id for collections owned by user_id
  # @param user_id [Integer] user id
  # @return [ActiveRecord()] array of {inventory_id, inventory, collections: []}
  scope :inventory_collections, lambda { |user_id|
    unscoped.unlocked.unshared.where(user_id: user_id, deleted_at: nil)
            .joins(SQL_INVENT_JOIN)
            .select(SQL_INVENT_SELECT)
            .from(SQL_INVENT_FROM)
            .group(:inventory_id, :inventories)
  }

  def self.get_all_collection_for_user(user_id)
    find_by(user_id: user_id, label: 'All', is_locked: true)
  end

  def self.bulk_update(user_id, collection_attributes, deleted_ids)
    ApplicationRecord.transaction do
      update_or_create(user_id, collection_attributes)
      update_parent_child_associations(user_id, collection_attributes)
      delete_set(user_id, deleted_ids)
    end
  end

  def self.filter_collection_attributes(user_id, collection_attributes)
    c_ids = collection_attributes.filter_map { |ca| (!ca['isNew'] && ca['id'].to_i) || nil }
    filtered_cids = Collection.where(id: c_ids, is_locked: false).filter_map do |c|
      if (c.user_id == user_id && !c.is_shared) ||
         (c.is_shared && (c.shared_by_id == user_id || (c.user_id == user_id && c.permission_level == 10)))
        c.id
      end
    end
    collection_attributes.select { |ca| ca['isNew'] || filtered_cids.include?(ca['id'].to_i) }
  end

  def self.update_or_create(user_id, collection_attributes, position = 0)
    return unless collection_attributes && user_id.is_a?(Integer)

    filter_collection_attributes(user_id, collection_attributes).each do |attr|
      position += 1
      if attr['isNew']
        collection = create(label: attr['label'], user_id: user_id, position: position)
        attr['id'] = collection.id
      else
        find(attr['id']).update(label: attr['label'], position: position)
      end
      update_or_create(user_id, attr['children'], position + 1)
    end
  end

  def self.update_parent_child_associations(user_id, collection_attributes, grand_parent = nil)
    return unless collection_attributes && user_id.is_a?(Integer)

    filter_collection_attributes(user_id, collection_attributes).each do |attr|
      parent = Collection.find_by(id: attr['id'])
      next if parent.nil?

      # collection is a new root collection
      parent.update(parent: nil) unless grand_parent

      if attr['children']
        filter_collection_attributes(user_id, attr['children']).each do |attr_child|
          Collection.find_by(id: attr_child['id'])&.update(parent: parent)
        end
      end

      update_parent_child_associations(user_id, attr['children'], parent)
    end
  end

  def self.delete_set(user_id, deleted_ids)
    (
      Collection.where(id: deleted_ids, user_id: user_id, is_shared: false, is_locked: false) |
      Collection.where(id: deleted_ids, shared_by_id: user_id)
    ).each(&:destroy)
  end

  def self.reject_shared(user_id, collection_id)
    Collection.where(id: collection_id, user_id: user_id, is_shared: true)
              .find_each(&:destroy)
  end
end
# rubocop:enable Metrics/AbcSize, Rails/HasManyOrHasOneDependent,Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity
