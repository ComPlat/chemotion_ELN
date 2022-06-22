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
  belongs_to :user
  belongs_to :collection

  has_many :samples, through: :collection
  has_many :reactions, through: :collection
  has_many :wellplates, through: :collection
  has_many :screens, through: :collection
  has_many :research_plans, through: :collection
end
