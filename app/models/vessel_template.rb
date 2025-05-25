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
#  volume_amount    :float
#  volume_unit      :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  deleted_at       :datetime
#  weight_amount    :float
#  weight_unit      :string
#
# Indexes
#
#  index_vessel_templates_on_deleted_at  (deleted_at)
#
class VesselTemplate < ApplicationRecord
  acts_as_paranoid
  include Taggable

  has_many :vessels, dependent: :destroy
  has_one :container, as: :containable, dependent: :destroy

  accepts_nested_attributes_for :container
end
