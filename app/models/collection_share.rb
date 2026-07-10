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
  # most permission levels are directed at the elements, except pass ownership, this refers to the collection itself
  PERMISSION_LEVELS = {
    read_elements: 0,
    write_elements: 1,
    share_collection: 2,
    delete_elements: 3,
    import_elements: 4,
    pass_ownership: 6,
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

  def self.permission_level(key)
    PERMISSION_LEVELS[key] || -1
  end
end
