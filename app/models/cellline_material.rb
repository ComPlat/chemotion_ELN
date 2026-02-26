# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_materials
#
#  id                  :bigint           not null, primary key
#  name                :string
#  source              :string
#  cell_type           :string
#  organism            :jsonb
#  tissue              :jsonb
#  disease             :jsonb
#  growth_medium       :string
#  biosafety_level     :string
#  variant             :string
#  mutation            :string
#  optimal_growth_temp :float
#  cryo_pres_medium    :string
#  gender              :string
#  description         :string
#  deleted_at          :datetime
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  created_by          :integer
#
# Indexes
#
#  index_cellline_materials_on_name_and_source  (name,source) UNIQUE
#
class CelllineMaterial < ApplicationRecord
  acts_as_paranoid

  include PgSearch::Model

  has_many :literals, as: :element, dependent: :destroy
  has_many :literatures, through: :literals
end
