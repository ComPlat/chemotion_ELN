# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Analysis::SpectroscopyExporter do
  subject(:analysis_export) { described_class.new(action).to_clap(starts_at: 0).analysis_spectroscopy }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'ANALYSIS_SPECTROSCOPY',
      workup: {
        samples: [{ label: 'sample' }],
        molecular_entities: [{ label: 'entity' }],
        solvents: [{ label: 'solvent', ratio: 1 }],
      }.deep_stringify_keys,
    )
  end

  it 'exports samples, entities, and solvents' do
    expect(analysis_export.to_h).to eq(
      samples: [{ label: 'sample' }],
      molecular_entities: [{ label: 'entity' }],
      solvents: [{ solvent: { label: 'solvent' }, ratio: '1' }],
    )
  end
end
