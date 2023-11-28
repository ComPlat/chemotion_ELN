# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Models::DetectorExporter do
  subject(:detector_export) do
    described_class.new(
      detector_ontology_id: 'NCIT:detector1',
      conditions: { 'TEMPERATURE' => { 'value' => '25', 'unit' => 'CELSIUS' } },
    ).to_clap
  end

  before do
    create(:ontology, ontology_id: 'NCIT:detector1', label: 'PDA', name: 'PDA Detector')
  end

  it 'exports detector ontology and conditions' do
    expect(detector_export.to_h).to include(
      ontology: { id: 'NCIT:detector1', label: 'PDA', name: 'PDA Detector' },
      conditions: { temperature_control: { temperature: { value: 25.0, unit: :CELSIUS } } },
    )
  end
end
