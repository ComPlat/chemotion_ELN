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
require 'rails_helper'

RSpec.describe VesselTemplate do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to have_many(:vessels) }
end
