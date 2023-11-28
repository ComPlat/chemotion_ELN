# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Samples::SolventsWithRatioExporter do
  subject(:solvents_export) { described_class.new([{ 'id' => 'SOLVENT:1', 'label' => 'Water', 'ratio' => 2 }]).to_clap }

  before do
    create(:ontology, ontology_id: 'SOLVENT:1', label: 'Water', name: 'Water')
  end

  it 'exports solvent ratios with known ontologies' do
    expect(solvents_export.first.to_h).to eq(
      solvent: { label: 'Water', ontology: { id: 'SOLVENT:1', label: 'Water', name: 'Water' } },
      ratio: '2',
    )
  end
end
