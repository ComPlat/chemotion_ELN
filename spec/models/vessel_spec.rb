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
require 'rails_helper'

RSpec.describe Vessel do
  subject(:vessel) { build(:vessel) }

  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to belong_to(:vessel_template) }

  it {
    expect(vessel).to belong_to(:creator).class_name('User')
                                         .with_foreign_key(:user_id)
                                         .inverse_of(:created_vessels)
  }

  it { is_expected.to have_many(:collections).through(:collections_vessels) }
  it { is_expected.to have_many(:collections_vessels).dependent(:destroy) }

  it { is_expected.to delegate_method(:details).to(:vessel_template) }
  it { is_expected.to delegate_method(:material_details).to(:vessel_template) }
  it { is_expected.to delegate_method(:material_type).to(:vessel_template) }
  it { is_expected.to delegate_method(:vessel_type).to(:vessel_template) }
  it { is_expected.to delegate_method(:volume_amount).to(:vessel_template) }
  it { is_expected.to delegate_method(:volume_unit).to(:vessel_template) }
  # Vessel have their own weight_amount and weight_unit attributes because the template gives an
  #  approximate value.
  # it { is_expected.to delegate_method(:weight_amount).to(:vessel_template) }
  # it { is_expected.to delegate_method(:weight_unit).to(:vessel_template) }
end
