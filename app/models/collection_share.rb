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
#  index_collection_shares_on_collection_id   (collection_id)
#  index_collection_shares_on_shared_with_id  (shared_with_id)
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id)
#  fk_rails_...  (shared_with_id => users.id)
#
class CollectionShare < ApplicationRecord
  belongs_to :collection
  belongs_to :shared_with, class_name: "User"

  scope :shared_by, ->(user) { joins(:collection).where(collections: { user: user }) }
  scope :shared_with, ->(user) { where(shared_with: user) }
  scope :with_minimum_permission_level, ->(permission_level) { where("collection_shares.permission_level >= ?", permission_level) }
end
