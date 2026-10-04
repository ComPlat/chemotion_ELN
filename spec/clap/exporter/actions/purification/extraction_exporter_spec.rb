# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Purification::ExtractionExporter do
  subject(:extraction_export) { described_class.new(action).to_clap(starts_at: 0).extraction }

  let(:action) { create(:reaction_process_activity, activity_name: 'EXTRACTION', workup: { phase: 'bad' }) }

  it 'falls back for unknown extraction phases' do
    expect(extraction_export.phase).to eq(:UNSPECIFIED)
  end

  context 'with extraction steps' do
    let(:action) do
      create(
        :reaction_process_activity,
        activity_name: 'EXTRACTION',
        workup: {
          phase: 'ORGANIC',
          purification_steps: [{
            solvents: [{ label: 'solvent', ratio: 1 }],
            amount: { value: '1', unit: 'ml' },
            flow_rate: { value: '2', unit: 'MLMIN' },
            duration: 30_000,
          }],
        },
      )
    end

    it 'exports extraction steps' do
      expect(extraction_export.to_h).to include(
        phase: :ORGANIC,
        steps: [hash_including(duration: { value: 30.0, unit: :SECOND })],
      )
    end

    it 'exports extraction step amount and flow rate' do
      expect(extraction_export.steps.first.to_h).to include(
        amount: { volume: { value: 1.0, unit: :MILLILITER } },
        flow_rate: { value: 2.0, unit: :MILLILITER_PER_MINUTE },
      )
    end
  end
end
