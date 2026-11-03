# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Models::OntologyExporter do
  subject(:ontology_export) { described_class.new(ontology_id).to_clap }

  let(:ontology_id) { 'ONT:1' }

  before do
    create(:ontology, ontology_id: 'ONT:1', label: 'Label', name: 'Name')
  end

  it 'exports a known ontology' do
    expect(ontology_export).to eq(id: 'ONT:1', label: 'Label', name: 'Name')
  end

  context 'with a missing ontology value' do
    let(:ontology_id) { 'missing' }

    it 'marks missing ontology values' do
      expect(ontology_export).to include(label: 'Error: Ontology specified but non-existant')
    end
  end
end
