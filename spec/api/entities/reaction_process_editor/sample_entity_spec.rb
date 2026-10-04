# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SampleEntity do
  subject(:represented_sample) { described_class.represent(sample).as_json }

  let(:sample) { create(:valid_sample) }

  it 'exposes :short_label' do
    expect(represented_sample).to include(short_label: sample.short_label)
  end

  it 'exposes :external_label' do
    expect(represented_sample).to include(external_label: sample.external_label)
  end

  it 'exposes :name' do
    expect(represented_sample).to include(name: sample.name)
  end

  it 'exposes :metrics' do
    expect(represented_sample).to include(metrics: 'mmm')
  end

  it 'exposes :target_amount' do
    expect(represented_sample).to include(target_amount: { unit: 'mg', value: 1000.0 })
  end

  it 'exposes :sample amounts' do
    expect(represented_sample[:amounts]).to include(:mg, :mmol, :ml)
  end

  context 'with an Ontology Sample' do
    subject(:represented_ontology) { described_class.represent(ontology).as_json }

    let(:ontology) do
      create(:ontology, ontology_id: 'CHMO:sample-entity', label: 'Ontology')
    end

    it 'sets intermediate_type to "Ontology"' do
      expect(represented_ontology).to include(intermediate_type: 'Ontology')
    end
  end
end
