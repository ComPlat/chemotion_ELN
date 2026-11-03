# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Purification::CrystallizationExporter do
  subject(:crystallization_export) { described_class.new(action).to_clap(starts_at: nil).crystallization }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'CRYSTALLIZATION',
      workup: { crystallization_mode: 'bad',
                heating_duration: 6000,
                cooling_duration: 10_000,
                amount: { value: 10, unit: 'ml' },
                TEMPERATURE: { value: 300, unit: 'KELVIN' },
                solvents: [] },
    )
  end

  it 'exports all Crystallization attributes' do
    expect(crystallization_export.to_h).to include(
      amount: { volume: { value: 10.0, unit: :MILLILITER } },
      temperature: { value: 300.0, unit: :KELVIN },
      heating_duration: { value: 6.0, unit: :SECOND },
      cooling_duration: { value: 10.0, unit: :SECOND },
    )
  end

  it 'falls back for unknown crystallization modes' do
    expect(crystallization_export.crystallization_mode).to eq(:UNSPECIFIED)
  end

  context 'with complete crystallization parameters' do
    let(:action) do
      create(
        :reaction_process_activity,
        activity_name: 'CRYSTALLIZATION',
        workup: {
          purification_steps: [{ solvents: [{ label: 'solvent', ratio: 1 }] }],
          amount: { value: '5', unit: 'mg' },
          TEMPERATURE: { value: '5', unit: 'CELSIUS' },
          heating_duration: 10_000,
          cooling_duration: 20_000,
          crystallization_mode: 'COLD',
        },
      )
    end

    it 'exports crystallization parameters' do
      expect(crystallization_export.to_h).to include(
        amount: { mass: { value: 5.0, unit: :MILLIGRAM } },
        temperature: { value: 5.0, unit: :CELSIUS },
        heating_duration: { value: 10.0, unit: :SECOND },
        cooling_duration: { value: 20.0, unit: :SECOND },
        crystallization_mode: :COLD,
      )
    end

    it 'exports crystallization solvents' do
      expect(crystallization_export.solvents.map(&:to_h)).to eq(
        [{ solvent: { label: 'solvent' }, ratio: '1' }],
      )
    end
  end
end
