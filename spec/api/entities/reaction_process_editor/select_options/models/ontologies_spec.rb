# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Models::Ontologies do
  subject(:ontology_options) { described_class.new.all }

  let(:solvent_ontology) do
    create(
      :ontology,
      ontology_id: 'CHMO:solvent-option',
      label: 'Solvent Option',
    )
  end

  let(:ontology) do
    create(
      :ontology,
      ontology_id: 'CHMO:device-option',
      label: 'Device Option',
      detectors: ['CHMO:0001728'],
      solvents: [solvent_ontology.ontology_id],
      stationary_phase: ['CHMO:stationary-option'],
      active: true,
    )
  end

  let(:device_method) do
    create(:ontology_device_method, ontology: ontology, label: 'Method Option')
  end

  before do
    device_method
  end

  describe '#all' do
    let(:ontology_option) { ontology_options.find { |option| option[:value] == 'CHMO:device-option' } }

    it 'returns the ontology option label' do
      expect(ontology_option).to include('label' => 'Device Option')
    end

    it 'returns the ontology option value' do
      expect(ontology_option).to include(value: 'CHMO:device-option')
    end

    it 'returns detector options' do
      expect(ontology_option[:detectors]).to include(hash_including('label' => 'PDA'))
    end

    it 'returns mobile phase options' do
      expect(ontology_option[:mobile_phase]).to include(hash_including(label: 'Solvent Option'))
    end

    it 'returns stationary phase options' do
      expect(ontology_option[:stationary_phase]).to include(hash_including(ontology_id: 'CHMO:stationary-option'))
    end

    it 'returns method options' do
      expect(ontology_option[:methods]).to include(hash_including(value: 'Method Option'))
    end
  end
end
