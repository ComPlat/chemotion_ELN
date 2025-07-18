# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_materials
#
#  id                  :bigint           not null, primary key
#  biosafety_level     :string
#  cell_type           :string
#  created_by          :integer
#  cryo_pres_medium    :string
#  deleted_at          :datetime
#  description         :string
#  disease             :jsonb
#  gender              :string
#  growth_medium       :string
#  mutation            :string
#  name                :string
#  optimal_growth_temp :float
#  organism            :jsonb
#  source              :string
#  tissue              :jsonb
#  variant             :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_cellline_materials_on_name_and_source  (name,source) UNIQUE
#
require 'rails_helper'

RSpec.describe CelllineMaterial do
  pending "add some examples to (or delete) #{__FILE__}"
end
