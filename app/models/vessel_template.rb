# == Schema Information
#
# Table name: vessel_templates
#
#  id               :bigint           not null, primary key
#  name             :string
#  details          :string
#  vessel_type      :string
#  volume_unit      :string
#  volume_amount    :string
#  material_type    :string
#  material_details :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  deleted_at       :datetime
#
class VesselTemplate < ApplicationRecord
  acts_as_paranoid

  has_many :vessels, dependent: :destroy
end
