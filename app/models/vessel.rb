# frozen_string_literal: true

# == Schema Information
#
# Table name: vessels
#
#  id                 :uuid             not null, primary key
#  bar_code           :string
#  deleted_at         :datetime
#  description        :string
#  name               :string
#  qr_code            :string
#  short_label        :string
#  weight_amount      :float
#  weight_unit        :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  user_id            :bigint
#  vessel_template_id :uuid
#
# Indexes
#
#  index_vessels_on_deleted_at          (deleted_at)
#  index_vessels_on_user_id             (user_id)
#  index_vessels_on_vessel_template_id  (vessel_template_id)
#
class Vessel < ApplicationRecord
  acts_as_paranoid
  include Collectable
  include Taggable
  include ElementCodes
  include ElementUIStateScopes

  belongs_to :vessel_template
  belongs_to :creator, class_name: 'User', foreign_key: :user_id, inverse_of: :created_vessels

  has_many :collections_vessels, dependent: :destroy
  has_many :collections, through: :collections_vessels

  has_many :reaction_process_vessels, dependent: :destroy, class_name: 'ReactionProcessEditor::ReactionProcessVessel',
                                      inverse_of: :vesselable, foreign_key: :vesselable_id
  has_many :reaction_processes, through: :reaction_process_vessels,
                                class_name: 'ReactionProcessEditor::ReactionProcess'

  delegate :details, :material_details, :material_type, :vessel_type, :volume_amount, :volume_unit,
           to: :vessel_template
end
