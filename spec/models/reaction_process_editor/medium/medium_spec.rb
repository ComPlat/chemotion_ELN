# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Medium::Medium do
  subject(:medium) { described_class.new(name: 'TheMediumName') }

  describe 'label aliases' do
    its(:preferred_label) { is_expected.to eq('TheMediumName') }
    its(:short_label) { is_expected.to eq('TheMediumName') }
    its(:external_label) { is_expected.to eq('TheMediumName') }
    its(:label) { is_expected.to eq('TheMediumName') }
  end

  its(:target_amount_value) { is_expected.to be_nil }
  its(:target_amount_unit) { is_expected.to be_nil }
  its(:amount_mg) { is_expected.to be_nil }
  its(:amount_mmol) { is_expected.to be_nil }
  its(:amount_ml) { is_expected.to be_nil }
  its(:sample_svg_file) { is_expected.to be_nil }

  describe 'STI subclasses' do
    let(:additive) { create(:additive) }
    let(:diverse_solvent) { create(:diverse_solvent) }
    let(:modifier) { create(:modifier) }

    it 'persists additives as media' do
      expect(described_class.find(additive.id)).to be_a(Medium::Additive)
    end

    it 'persists diverse solvents as media' do
      expect(described_class.find(diverse_solvent.id)).to be_a(Medium::DiverseSolvent)
    end

    it 'persists modifiers as media' do
      expect(described_class.find(modifier.id)).to be_a(Medium::Modifier)
    end
  end
end
