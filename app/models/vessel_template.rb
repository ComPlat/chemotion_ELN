# frozen_string_literal: true

# == Schema Information
#
# Table name: vessel_templates
#
#  id               :uuid             not null, primary key
#  name             :string
#  details          :string
#  material_details :string
#  material_type    :string
#  vessel_type      :string
#  volume_amount    :integer
#  volume_unit      :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  deleted_at       :datetime
#
# Indexes
#
#  index_vessel_templates_on_deleted_at  (deleted_at)
#
class VesselTemplate < ApplicationRecord
  acts_as_paranoid

  has_many :vessels, dependent: :destroy
end
