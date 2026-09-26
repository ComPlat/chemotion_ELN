# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Purification::FiltrationExporter do
  subject(:filtration_export) { described_class.new(action).to_clap(starts_at: 0).filtration }

  let(:action) { create(:reaction_process_activity, activity_name: 'FILTRATION', workup: { filtration_mode: 'bad' }) }

  it 'falls back for unknown filtration modes' do
    expect(filtration_export.filtration_mode).to eq(:UNSPECIFIED)
  end

  context 'with filtration steps' do
    let(:action) do
      create(
        :reaction_process_activity,
        activity_name: 'FILTRATION',
        workup: {
          filtration_mode: 'KEEP_SUPERNATANT',
          purification_steps: [{
            solvents: [{ label: 'solvent', ratio: 1 }],
            amount: { value: '1', unit: 'ml' },
            repetitions: { value: 2 },
            rinse_vessel: true,
            duration: 30_000,
          }],
        },
      )
    end

    it 'exports filtration steps' do
      expect(filtration_export.to_h).to include(
        filtration_mode: :KEEP_SUPERNATANT,
        steps: [hash_including(repetitions: 2)],
      )
    end

    it 'exports filtration step amount and duration' do
      expect(filtration_export.steps.first.to_h).to include(
        amount: { volume: { value: 1.0, unit: :MILLILITER } },
        duration: { value: 30.0, unit: :SECOND },
      )
    end

    it 'exports vessel rinsing for the filtration step' do
      expect(filtration_export.steps.first.rinse_vessel).to be true
    end
  end
end
