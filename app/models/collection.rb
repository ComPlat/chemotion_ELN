# frozen_string_literal: true

# rubocop:disable Rails/HasManyOrHasOneDependent

# == Schema Information
#
# Table name: collections
#
#  id           :integer          not null, primary key
#  ancestry     :string           default("/"), not null
#  deleted_at   :datetime
#  is_locked    :boolean          default(FALSE)
#  label        :text             not null
#  position     :integer
#  shared       :boolean          default(FALSE), not null
#  tabs_segment :jsonb
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  inventory_id :bigint
#  user_id      :integer          not null
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
  has_ancestry orphan_strategy: :adopt

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
    end,
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
    end,
  )

  # returns collections the user may create elements in: own collections and those shared with at
  # least add_elements permission. Creating an element inserts a collections_<element> row, so it is
  # an "add", not an "edit" — a sharee at :edit_elements may change existing content but not inject
  # new records into someone else's collection.
  scope(
    :writable_by,
    lambda do |user|
      user_and_group_ids = [user.id, *user.group_ids]
      left_joins(:collection_shares)
      .left_joins(:inventory)
      .where(user_id: user_and_group_ids)
      .or(
        where(
          collection_shares: {
            shared_with_id: user_and_group_ids,
            permission_level: CollectionShare.permission_level(:add_elements)..,
          },
        ),
      )
      .distinct
    end,
  )

  # temp for labimotion
  scope(
    :belongs_to_or_shared_by,
    lambda do |user_ids, group_ids|
      user_and_group_ids = [user_ids, group_ids]
      left_joins(:collection_shares)
      .left_joins(:inventory)
      .where(user_id: user_and_group_ids)
      .or(where(collection_shares: { shared_with_id: user_and_group_ids }))
      .distinct
    end,
  )

  scope :own_collections_for, ->(user) { left_joins(:inventory).where(user_id: [user.id, *user.group_ids]) }
  scope(
    :serialized_own_collections_for,
    lambda do |user|
      own_collections_for(user).select(
        'collections.*, inventories.name AS inventory_name, inventories.prefix AS inventory_prefix',
      )
    end,
  )

  scope(
    :shared_collections_for,
    lambda do |user|
      joins(:collection_shares)
        .joins(:user)
        .left_joins(:inventory)
        .where(collection_shares: { shared_with_id: [user.id, *user.group_ids] })
        .distinct
    end,
  )
  # One row per **collection**, not per share. A collection can be shared to the same user twice —
  # directly, and again through one of their groups — and those two rows may carry different
  # permission levels. `shared_collections_for`'s `.distinct` cannot collapse them because the
  # selected `collection_shares.id` / `permission_level` differ, so the collection would appear
  # twice in the recipient's tree with no explanation.
  #
  # - `permission_level` is the MAX across the user's own share and their groups' shares. That is
  #   already the effective grant: every policy check is `shared_with_minimum_permission_level(..).any?`
  #   and `ElementsPolicy` takes `MAX(collection_shares.permission_level)` explicitly.
  # - `collection_share_id` is the user's **direct** share, and is NULL when access is purely
  #   group-derived. Rejecting a share must never destroy the group's share row on behalf of every
  #   other member — to drop group-derived access a user leaves the group.
  # - `shared_via_group` lets the UI explain *why* a collection is there.
  # - `owner` carries the abbreviation for the provenance popover; `owner_name` is the plain name for
  #   the tree's owner-root label. The join to +users+ is a LEFT join so that a collection whose owner
  #   was hard-destroyed (or whose `user_id` dangles — there is no DB FK to users) is still returned to
  #   its recipients; both owner strings then COALESCE to a `Deleted user #<id>` placeholder rather
  #   than dropping the collection from the shared list. (A normal account deletion is a soft-delete
  #   that keeps the owner row, so this only covers the hard-destroy edge.) The join is raw SQL rather
  #   than `left_joins(:user)`: `User` is `acts_as_paranoid`, and an association-based join merges the
  #   target class's default scope into the join's ON clause, so a soft-deleted-but-present owner would
  #   also read as `users.id IS NULL` — indistinguishable from the hard-destroy case this is meant to
  #   isolate.
  scope(
    :serialized_shared_collections_for,
    lambda do |user|
      # user.id comes from the DB; .to_i keeps it un-injectable inside the aggregate FILTERs, which
      # cannot take a bind parameter through .select.
      own_share = "collection_shares.shared_with_id = #{user.id.to_i}"
      # concat() treats NULL as '', so a missing owner must be detected by users.id IS NULL (the LEFT
      # join produced no row), not by COALESCE over the concat.
      deleted_owner = "concat('Deleted user #', collections.user_id)"
      owner_abbr = 'concat(users.first_name, chr(32), users.last_name, chr(40), users.name_abbreviation, chr(41))'
      owner_plain = 'concat(users.first_name, chr(32), users.last_name)'

      joins(:collection_shares)
        .joins('LEFT JOIN users ON users.id = collections.user_id')
        .left_joins(:inventory)
        .where(collection_shares: { shared_with_id: [user.id, *user.group_ids] })
        .group('collections.id, inventories.id, users.id')
        .select(
          [
            'collections.*',
            "MAX(collection_shares.id) FILTER (WHERE #{own_share}) AS collection_share_id",
            'MAX(collection_shares.permission_level) AS permission_level',
            "bool_or(NOT (#{own_share})) AS shared_via_group",
            'inventories.name AS inventory_name',
            'inventories.prefix AS inventory_prefix',
            "CASE WHEN users.id IS NULL THEN #{deleted_owner} ELSE #{owner_abbr} END AS owner",
            "CASE WHEN users.id IS NULL THEN #{deleted_owner} ELSE #{owner_plain} END AS owner_name",
          ].join(', '),
        )
    end,
  )

  scope(
    :shared_with_minimum_permission_level,
    lambda do |user, permission_level|
      joins(:collection_shares)
        .merge(
          CollectionShare
            .shared_with(user)
            .with_minimum_permission_level(permission_level),
        )
    end,
  )

  scope(
    :shared_with_minimum_detail_level,
    lambda do |user, detail_level_field, detail_level|
      joins(:collection_shares)
        .merge(
          CollectionShare
            .shared_with(user)
            .with_minimum_detail_level(detail_level_field, detail_level),
        )
    end,
  )

  default_scope { ordered }
  SQL_INVENT_SELECT = 'inventory_id,' \
                      'row_to_json(inventories) AS inventory,' \
                      'JSON_AGG(collections) AS collections'
  SQL_INVENT_FROM = '(select c.id,c."label",c.inventory_id,c.deleted_at,' \
                    'c.is_locked,c.user_id from collections c) collections'

  # group by inventory_id for collections owned by user_id
  # @param user_id [Integer] user id
  # @return [ActiveRecord()] array of {inventory_id, inventory, collections: []}
  scope(
    :inventory_collections,
    lambda do |user|
      unscoped
        .unlocked
        .own_collections_for(user)
        .where(deleted_at: nil)
        .select(SQL_INVENT_SELECT)
        .from(SQL_INVENT_FROM)
        .group(:inventory_id, :inventories)
    end,
  )

  def self.get_all_collection_for_user(user_id)
    find_by(user_id: user_id, label: 'All', is_locked: true)
  end

  # The keys {#detail_levels_for_user} resolves. Extend when a new element type gains a detail level.
  DETAIL_LEVEL_KEYS = %i[
    permission_level
    sample_detail_level
    reaction_detail_level
    wellplate_detail_level
    screen_detail_level
    researchplan_detail_level
    element_detail_level
    celllinesample_detail_level
    devicedescription_detail_level
    sequencebasedmacromoleculesample_detail_level
  ].freeze

  # The level granted to an owner. Above every real rung, so an owner passes any threshold.
  OWNER_LEVEL = 10

  # A collection owned by a group belongs to each of its members, which is how +own_collections_for+,
  # +accessible_for+ and +writable_by+ all read it.
  def owned_by?(user)
    user_id.in?([user.id, *user.group_ids])
  end

  # What +user+ effectively gets on this collection.
  #
  # A user may hold several shares on one collection at once — their own, plus one for each group
  # they belong to — and those shares may disagree. The effective value of each level is their
  # **maximum**, which is the rule the authorization layer already applies: +ElementPolicy+ checks
  # +shared_with_minimum_permission_level(..).any?+ and both +ElementsPolicy+ and
  # {ElementDetailLevelCalculator} take an explicit +MAX+.
  #
  # @param user [User]
  # @return [Hash{Symbol => Integer}] every key of {DETAIL_LEVEL_KEYS}
  def detail_levels_for_user(user)
    return DETAIL_LEVEL_KEYS.index_with { OWNER_LEVEL } if owned_by?(user)

    # Loaded once and reduced in memory: a handful of rows, versus one MAX query per key.
    shares = CollectionShare.shared_with(user).where(collection: self).to_a
    return DETAIL_LEVEL_KEYS.index_with { 0 } if shares.empty?

    DETAIL_LEVEL_KEYS.index_with { |key| shares.pluck(key).compact.max || 0 }
  end

  # The subset of +collection_ids+ on which +user+ holds FULL detail access: the maximum
  # ({OWNER_LEVEL}) on every element detail level, aggregated across all their shares (direct and
  # group) exactly as {#detail_levels_for_user} reduces them. Used to gate the raw export path,
  # which serializes full element content ignoring detail levels — a sharee below full detail on
  # any element type must not export a collection and read data their share deliberately withheld.
  # Resolved in one grouped query rather than a predicate per collection. Owners are authorised
  # separately and are not considered here.
  #
  # @param user [User]
  # @param collection_ids [Array<Integer>]
  # @return [Array<Integer>] the ids among +collection_ids+ the user may fully read
  def self.full_detail_access_ids(user, collection_ids)
    return [] if collection_ids.blank?

    detail_columns = DETAIL_LEVEL_KEYS - [:permission_level]
    having = detail_columns.map { |column| "MAX(#{column}) >= #{OWNER_LEVEL}" }.join(' AND ')
    CollectionShare.shared_with(user)
                   .where(collection_id: collection_ids)
                   .group(:collection_id)
                   .having(Arel.sql(having))
                   .pluck(:collection_id)
  end
end
# rubocop:enable Rails/HasManyOrHasOneDependent
