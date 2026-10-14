# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Analysis::ElementalExporter do
  subject(:analysis_export) { described_class.new(action).to_clap(starts_at: 0).analysis_elemental }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'ANALYSIS_ELEMENTAL',
      workup: {
        samples: [{ label: 'sample' }],
        molecular_entities: [{ label: 'entity' }],
        detector: ['DET:1'],
      }.deep_stringify_keys,
    )
  end

  before do
    ReactionProcessEditor::Ontology.create!(ontology_id: 'DET:1', label: 'Detector', name: 'Detector')
  end

  it 'exports samples, entities, and detector ontologies' do
    expect(analysis_export.to_h).to eq(
      samples: [{ label: 'sample' }],
      molecular_entities: [{ label: 'entity' }],
      detectors: [{ id: 'DET:1', label: 'Detector', name: 'Detector' }],
    )
  end
end
