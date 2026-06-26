# frozen_string_literal: true

# == Schema Information
#
# Table name: ontologies
#
#  id               :uuid             not null, primary key
#  active           :boolean          default(TRUE), not null
#  detectors        :string           default([]), is an Array
#  label            :string
#  link             :string
#  name             :string
#  ontology_type    :string
#  roles            :jsonb
#  solvents         :string           default([]), is an Array
#  stationary_phase :string           is an Array
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  ontology_id      :string
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::Ontology do
  subject(:ontology) do
    described_class.new(ontology_id: 'CHMO:0000001', label: 'Ontology label')
  end

  it { is_expected.to validate_presence_of(:ontology_id) }
  it { is_expected.to validate_uniqueness_of(:ontology_id) }

  it { is_expected.to have_many(:device_methods).dependent(:nullify) }

  it 'exposes label as short_label' do
    expect(ontology.short_label).to eq('Ontology label')
  end

  it 'exposes label as external_label' do
    expect(ontology.external_label).to eq('Ontology label')
  end

  its(:target_amount_value) { is_expected.to be_nil }
  its(:target_amount_unit) { is_expected.to be_nil }
  its(:amount_mg) { is_expected.to be_nil }
  its(:amount_mmol) { is_expected.to be_nil }
  its(:amount_ml) { is_expected.to be_nil }
  its(:sample_svg_file) { is_expected.to be_nil }
  its(:metrics) { is_expected.to be_nil }
  its(:location) { is_expected.to be_nil }
  its(:hide_in_eln) { is_expected.to be true }
  its(:purity) { is_expected.to eq(1) }
end
