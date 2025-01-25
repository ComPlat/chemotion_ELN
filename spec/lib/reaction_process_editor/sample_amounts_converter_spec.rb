# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionProcessEditor::SampleAmountsConverter do
  describe '#to_rpe' do
    subject(:to_rpe) { described_class.to_rpe(sample) }

    let(:specified_value) { 2 }

    let!(:sample) do
      create :sample,
             target_amount_unit: unit,
             target_amount_value: specified_value,
             metrics: metrics
    end

    context 'with gram' do
      let(:unit) { 'g' }
      let(:metrics) { 'n---' }

      it { is_expected.to eq({ value: specified_value, unit: 'g' }) }
    end

    context 'with miligram' do
      let(:unit) { 'g' }
      let(:metrics) { 'm---' }

      it { is_expected.to eq({ value: specified_value * 1000, unit: 'mg' }) }
    end

    context 'with liter' do
      let(:unit) { 'l' }
      let(:metrics) { '-n--' }

      it { is_expected.to eq({ value: specified_value, unit: 'l' }) }
    end

    context 'with mililiter' do
      let(:unit) { 'l' }
      let(:metrics) { '-m--' }

      it { is_expected.to eq({ value: specified_value * 1000, unit: 'ml' }) }
    end

    context 'with unspecified amount' do
      let(:specified_value) { nil }
      let(:unit) { 'anyUnit' }
      let(:metrics) { nil }

      it { is_expected.to eq({ unit: 'anyUnit' }) }
    end
  end

  describe '#to_eln' do
    subject(:to_eln) { described_class.to_eln(workup) }

    let(:specified_value) { 3.to_f }
    let(:workup) { { target_amount: { value: specified_value, unit: unit } }.deep_stringify_keys }

    context 'with gram' do
      let(:unit) { 'g' }

      it { is_expected.to eq({ value: specified_value, unit: 'g', metrics: 'nmmm' }) }
    end

    context 'with miligram' do
      let(:unit) { 'mg' }

      it { is_expected.to eq({ value: specified_value / 1000, unit: 'g', metrics: 'mmmm' }) }
    end

    context 'with liter' do
      let(:unit) { 'l' }

      it { is_expected.to eq({ value: specified_value, unit: 'l', metrics: 'mnmm' }) }
    end

    context 'with mililiter' do
      let(:unit) { 'ml' }

      it { is_expected.to eq({ value: specified_value / 1000, unit: 'l', metrics: 'mmmm' }) }
    end

    context 'with unspecified amount' do
      let(:specified_value) { nil }
      let(:unit) { 'anyUnit' }

      it { is_expected.to eq({ value: nil, unit: 'anyUnit', metrics: nil }) }
    end
  end
end
