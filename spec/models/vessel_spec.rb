# frozen_string_literal: true

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
  it { is_expected.to delegate_method(:weight_amount).to(:vessel_template) }
  it { is_expected.to delegate_method(:weight_unit).to(:vessel_template) }
end
