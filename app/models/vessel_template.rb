# frozen_string_literal: true

# == Schema Information
#
# Table name: vessel_templates
#
#  id               :uuid             not null, primary key
#  deleted_at       :datetime
#  details          :string
#  material_details :string
#  material_type    :string
#  name             :string
#  vessel_type      :string
#  volume_amount    :float
#  volume_unit      :string
#  weight_amount    :float
#  weight_unit      :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#
# Indexes
#
#  index_vessel_templates_on_deleted_at  (deleted_at)
#  index_vessel_templates_on_name        (name) UNIQUE
#
class VesselTemplate < ApplicationRecord
  acts_as_paranoid
  include Taggable

  has_many :vessels, dependent: :destroy
  has_one :container, as: :containable, dependent: :destroy

  accepts_nested_attributes_for :container
  has_many :reaction_process_vessels, dependent: :destroy, class_name: 'ReactionProcessEditor::ReactionProcessVessel',
                                      inverse_of: :vesselable, foreign_key: :vesselable_id
end
