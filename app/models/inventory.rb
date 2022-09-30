# == Schema Information
#
# Table name: inventories
#
#  id                   :bigint           not null, primary key
#  inventory_parameters :jsonb
#  inventoriable_id     :integer
#  inventoriable_type   :string
#
# Indexes
#
#  index_inventories_on_inventoriable_type_and_inventoriable_id  (inventoriable_type,inventoriable_id)
#
class Inventory < ApplicationRecord
  belongs_to :inventoriable, polymorphic: true, optional: true
  validates :inventoriable, presence: true
end
