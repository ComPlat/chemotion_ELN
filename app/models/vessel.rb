# frozen_string_literal: true

# == Schema Information
#
# Table name: vessels
#
#  id                 :uuid             not null, primary key
#  vessel_template_id :uuid
#  user_id            :bigint
#  name               :string
#  description        :string
#  short_label        :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  deleted_at         :datetime
#  bar_code           :string
#  qr_code            :string
#
# Indexes
#
#  index_vessels_on_deleted_at          (deleted_at)
#  index_vessels_on_user_id             (user_id)
#  index_vessels_on_vessel_template_id  (vessel_template_id)
#
class Vessel < ApplicationRecord
  acts_as_paranoid
  include Taggable
  include ElementCodes
  include ElementUIStateScopes

  belongs_to :vessel_template
  belongs_to :creator, class_name: 'User', foreign_key: :user_id, inverse_of: :created_vessels

  has_many :collections_vessels, dependent: :destroy
  has_many :collections, through: :collections_vessels

  delegate :details, :material_details, :material_type, :vessel_type, :volume_amount, :volume_unit,
           to: :vessel_template
end
