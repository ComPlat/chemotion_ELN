# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::Constants::Ontologies do
  describe 'defines required constants' do
    it 'defines ACTION_ONTOLOGIES' do
      expect(described_class::ACTION_ONTOLOGIES).to be_a(Hash)
    end

    it 'defines DEFAULT_AUTOMATION_MODE' do
      expect(described_class::DEFAULT_AUTOMATION_MODE).to eq 'NCIT:C70669'
    end

    it 'defines AUTOMATION_MANUAL_MODES' do
      expect(described_class::AUTOMATION_MANUAL_MODES).to eq ['NCIT:C63513']
    end

    it 'defines AUTOMATION_AUTOMATED_MODES' do
      expect(described_class::AUTOMATION_AUTOMATED_MODES).to eq ['NCIT:C172484', 'NCIT:C70669']
    end
  end

  describe '.automation_mode_manual?' do
    it 'is true for manual automation modes' do
      expect(described_class.automation_mode_manual?('NCIT:C63513')).to be true
    end
  end

  describe '.automation_mode_automated?' do
    it 'is true for automated automation modes' do
      expect(described_class.automation_mode_automated?('NCIT:C70669')).to be true
    end

    it 'is true for semiautomated automation modes' do
      expect(described_class.automation_mode_automated?('NCIT:C172484')).to be true
    end
  end

  describe '.action_ontology_workup' do
    it 'returns action_ontology_workup' do
      expect(described_class.action_ontology_workup('CHROMATOGRAPHY')).to eq(
        'class' => 'CHMO:0001000',
        'action' => 'CHMO:0002231',
      )
    end

    it 'returns an empty hash for unknown actions' do
      expect(described_class.action_ontology_workup('UNKNOWN')).to eq({})
    end
  end
end
