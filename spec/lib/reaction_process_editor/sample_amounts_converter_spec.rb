# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionProcessEditor::SampleAmountsConverter do
  describe '#to_rpe' do
    subject(:to_rpe) { described_class.to_rpe(sample) }

    let!(:sample) do
      create :sample,
             target_amount_unit: unit,
             target_amount_value: 2,
             metrics: metrics
    end

    context 'with gram' do
      let(:unit) { 'g' }
      let(:metrics) { 'n---' }

      it { is_expected.to eq({ value: 2, unit: 'g' }) }
    end

    context 'with miligram' do
      let(:unit) { 'g' }
      let(:metrics) { 'm---' }

      it { is_expected.to eq({ value: 2000, unit: 'mg' }) }
    end

    context 'with liter' do
      let(:unit) { 'l' }
      let(:metrics) { '-n--' }

      it { is_expected.to eq({ value: 2, unit: 'l' }) }
    end

    context 'with mililiter' do
      let(:unit) { 'l' }
      let(:metrics) { '-m--' }

      it { is_expected.to eq({ value: 2000, unit: 'ml' }) }
    end
  end

  describe '#to_eln' do
    subject(:to_eln) { described_class.to_eln(workup) }

    let(:workup) { { target_amount: { value: 3, unit: unit } }.deep_stringify_keys }

    context 'with gram' do
      let(:unit) { 'g' }

      it { is_expected.to eq({ value: 3, unit: 'g', metrics: 'nmmm' }) }
    end

    context 'with miligram' do
      let(:unit) { 'mg' }

      it { is_expected.to eq({ value: 0.003, unit: 'g', metrics: 'mmmm' }) }
    end

    context 'with liter' do
      let(:unit) { 'l' }

      it { is_expected.to eq({ value: 3, unit: 'l', metrics: 'mnmm' }) }
    end

    context 'with mililiter' do
      let(:unit) { 'ml' }

      it { is_expected.to eq({ value: 0.003, unit: 'l', metrics: 'mmmm' }) }
    end
  end
end
