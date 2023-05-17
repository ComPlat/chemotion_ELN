# == Schema Information
#
# Table name: collection_acls
#
#  id                        :bigint           not null, primary key
#  user_id                   :integer          not null
#  collection_id             :integer          not null
#  label                     :string
#  permission_level          :integer          default(0)
#  sample_detail_level       :integer          default(0)
#  reaction_detail_level     :integer          default(0)
#  wellplate_detail_level    :integer          default(0)
#  screen_detail_level       :integer          default(0)
#  researchplan_detail_level :integer          default(10)
#  element_detail_level      :integer          default(10)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#
# Indexes
#
#  index_collection_acls_on_collection_id  (collection_id)
#  index_collection_acls_on_user_id        (user_id)
#

class CollectionAcl < ApplicationRecord
  PERMISSION_LEVELS_KEYS = %i[
    permission_level
    sample_detail_level
    reaction_detail_level
    wellplate_detail_level
    screen_detail_level
    researchplan_detail_level
    element_detail_level
  ]
  PERMISSION_LEVELS_MAX = Hash[
    permission_level: 10,
    sample_detail_level: 10,
    reaction_detail_level: 10,
    wellplate_detail_level: 10,
    screen_detail_level: 10,
    researchplan_detail_level: 10,
    element_detail_level: 10,
  ]


  belongs_to :user
  belongs_to :collection

  has_many :samples, through: :collection
  has_many :reactions, through: :collection
  has_many :wellplates, through: :collection
  has_many :screens, through: :collection
  has_many :research_plans, through: :collection

  def self permission_levels_from_collections(collection_id, user_id)
    maxima = where(collection_id: collection_id, user_id: user_id).pluck(*PERMISSION_LEVELS_KEYS).transpose.map(&:max)
    Hash[PERMISSION_LEVELS_KEYS.zip(maxima)]
  end
end
