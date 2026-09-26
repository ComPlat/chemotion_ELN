# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Models::DeviceMethods do
  subject(:select_options_base) do
    described_class.new.select_options_for([device_method])
  end

  let(:device_method) do
    create(
      :ontology_device_method,
      label: 'Method A',
      mobile_phase: ['CHMO:solvent (50% CHMO:solute)', 'CHMO:Unsoluted ()'],
      stationary_phase: ['CHMO:stationary'],
    )
  end

  before do
    create(:ontology, ontology_id: 'CHMO:solvent', label: 'Solvent')
    create(:ontology, ontology_id: 'CHMO:Unsoluted', label: 'Unsoluted')
    create(:ontology, ontology_id: 'CHMO:solute', label: 'Solute')
  end

  describe '#select_options_for' do
    it 'maps device methods to ontology-shaped options' do
      expect(select_options_base).to include(
        hash_including(
          value: 'Method A',
          ontology_id: 'Method A',
          mobile_phase: include(hash_including(label: 'Solvent (50% Solute)'),
                                hash_including(label: 'Unsoluted')),
          stationary_phase: [hash_including(ontology_id: 'CHMO:stationary')],
        ),
      )
    end
  end
end
