# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_shares
#
#  id                                            :bigint           not null, primary key
#  celllinesample_detail_level                   :integer          default(0), not null
#  devicedescription_detail_level                :integer          default(0), not null
#  element_detail_level                          :integer          default(0), not null
#  permission_level                              :integer          default(0), not null
#  reaction_detail_level                         :integer          default(0), not null
#  researchplan_detail_level                     :integer          default(0), not null
#  sample_detail_level                           :integer          default(0), not null
#  screen_detail_level                           :integer          default(0), not null
#  sequencebasedmacromoleculesample_detail_level :integer          default(0), not null
#  wellplate_detail_level                        :integer          default(0), not null
#  created_at                                    :datetime         not null
#  updated_at                                    :datetime         not null
#  collection_id                                 :bigint
#  shared_with_id                                :bigint           not null
#
# Indexes
#
#  index_collection_shares_on_collection_id                     (collection_id)
#  index_collection_shares_on_collection_id_and_shared_with_id  (collection_id,shared_with_id) UNIQUE
#  index_collection_shares_on_shared_with_id                    (shared_with_id)
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id)
#  fk_rails_...  (shared_with_id => users.id)
#
class CollectionShare < ApplicationRecord
  # Cumulative permission ladder, ordered by how destructive the capability is. A check is always
  # "a share exists with permission_level >= N", so every rung silently grants the ones below it.
  #
  # 0 read_elements   read the collection and its elements
  # 1 edit_elements   + edit element content (audited via logidze)
  # 2 add_elements    + create new elements, add/import existing ones, propagate elements onward
  # 3 remove_elements + unlink any element from this collection (NOT destroy the element record —
  #                     destroying is owner-only, see ElementPolicy#destroy?)
  # 4 manage_shares   + CRUD on this collection's collection_shares rows (delegated ACL admin)
  # 5 pass_ownership  + transfer ownership of the collection (no endpoint yet)
  #
  # The frontend mirrors this in app/javascript/src/utilities/PermissionConst.js — keep in sync.
  PERMISSION_LEVELS = {
    read_elements: 0,
    edit_elements: 1,
    add_elements: 2,
    remove_elements: 3,
    manage_shares: 4,
    pass_ownership: 5,
  }.freeze

  belongs_to :collection
  belongs_to :shared_with, class_name: 'User'

  scope :shared_by, ->(user) { joins(:collection).where(collections: { user_id: [user.id, *user.group_ids] }) }

  # Every share that grants +user+ access, including the ones held by their groups. Use for
  # *authorization* — never to decide what a user may destroy: a group's share is not theirs.
  scope :shared_with, ->(user) { where(shared_with_id: [user.id, *user.group_ids]) }

  # Only the share addressed to +user+ personally. Use when the user acts *on the share itself*
  # (rejecting it). A user who wants to drop group-derived access leaves the group instead.
  scope :shared_directly_with, ->(user) { where(shared_with_id: user.id) }
  scope(
    :with_minimum_permission_level,
    ->(permission_level) { where(collection_shares: { permission_level: permission_level.. }) },
  )
  scope(
    :with_minimum_detail_level,
    ->(detail_level_field, detail_level) { where("#{detail_level_field} >= ?", detail_level) },
  )

  # @param key [Symbol] one of {PERMISSION_LEVELS}' keys
  # @return [Integer] the level for +key+
  # @raise [KeyError] if +key+ is not a known permission level
  def self.permission_level(key)
    PERMISSION_LEVELS.fetch(key)
  end
end
