# frozen_string_literal: true

# rubocop:disable Metrics/AbcSize, Rails/HasManyOrHasOneDependent, Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity

# == Schema Information
#
# Table name: collections
#
#  id                     :integer          not null, primary key
#  ancestry               :string           default("/"), not null
#  deleted_at             :datetime
#  label                  :text             not null
#  position               :integer
#  tabs_segment           :jsonb
#  wellplate_detail_level :integer          default(10)
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  inventory_id           :bigint
#  user_id                :integer          not null
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
  has_many :collection_shares

  has_one :metadata

  delegate :prefix, :name, to: :inventory, allow_nil: true, prefix: :inventory

  scope :locked, -> { where(is_locked: true) }
  scope :ordered, -> { order('position ASC') }
  scope :unlocked, -> { where(is_locked: false) }

  scope(
    :shared_with_more_than_one_user,
    lambda do
      joins(:collection_shares)
        .select('collections.id, COUNT(collections.id)')
        .group('collections.id')
        .having('COUNT(collection.id) > 1')
    end
  )

  # returns the users own collections and those shared with him
  # WARNING: Doing this for a large number of collections is very slow, due to
  # the required joins
  scope(
    :accessible_for,
    lambda do |user|
      user_and_group_ids = [user.id, *user.group_ids]
      left_joins(:collection_shares)
      .left_joins(:inventory)
      .where(user_id: user_and_group_ids)
      .or(where(collection_shares: { shared_with_id: user_and_group_ids }))
      .distinct
    end
  )

  # returns only the own collections, NOT those shared with him
  scope(
    :own_collections_for,
    lambda do |user|
      left_joins(:inventory)
        .where(user_id: [user.id, *user.group_ids])
        .distinct
        .select('collections.*, inventories.name AS inventory_name, inventories.prefix AS inventory_prefix')
    end
  )
  scope(
    :shared_collections_for,
    lambda do |user|
      joins(:collection_shares)
        .joins(:user)
        .left_joins(:inventory)
        .where(collection_shares: { shared_with_id: [user.id, *user.group_ids] })
        .distinct
        .select(
          [
            'collections.*',
            'inventories.name AS inventory_name',
            'inventories.prefix AS inventory_prefix',
            'concat(users.first_name, chr(32), users.last_name, chr(40), users.name_abbreviation, chr(41)) AS owner'
          ].join(', ')
        )
    end
  )

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

  def self.delete_set(user_id, deleted_ids)
    (
      Collection.where(id: deleted_ids, user_id: user_id, is_shared: false, is_locked: false) |
      Collection.where(id: deleted_ids, shared_by_id: user_id)
    ).each(&:destroy)
  end
end
# rubocop:enable Metrics/AbcSize, Rails/HasManyOrHasOneDependent,Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity
