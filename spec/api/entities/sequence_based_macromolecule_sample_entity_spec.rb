# frozen_string_literal: true

require 'rails_helper'

describe Entities::SequenceBasedMacromoleculeSampleEntity do
  describe '.represent' do
    subject(:entity) { described_class.represent(sbmm_sample) }

    context 'when SBMM is from Uniprot' do
      let(:sbmm_sample) do
        build(
          :sequence_based_macromolecule_sample,
          heterologous_expression: 'yes',
          taxon_id: '54321',
          localisation: 'Irgendwie',
          organism: 'Homo Sapiens',
          strain: 'WhatIsAStrain',
          tissue: 'Tempo',
          sequence_based_macromolecule: build(
            :uniprot_sbmm,
            heterologous_expression: 'no',
            taxon_id: '12345',
            localisation: 'Irgendwo',
            organism: 'Ailurus Fulgens',
            strain: 'SomeStrain',
            tissue: 'Zewa'
          )
        )
      end

      it 'hides some attributes' do
        expect(grape_entity_as_hash.key?(:heterologous_expression)).to be false
        expect(grape_entity_as_hash.key?(:taxon_id)).to be false
        expect(grape_entity_as_hash.key?(:localisation)).to be false
        expect(grape_entity_as_hash.key?(:organism)).to be false
        expect(grape_entity_as_hash.key?(:strain)).to be false
        expect(grape_entity_as_hash.key?(:tissue)).to be false
      end
    end

    context 'when SBMM is not from Uniprot' do
      let(:sbmm_sample) do
        build(
          :sequence_based_macromolecule_sample,
          heterologous_expression: 'yes',
          taxon_id: '54321',
          localisation: 'Irgendwie',
          organism: 'Homo Sapiens',
          strain: 'WhatIsAStrain',
          tissue: 'Tempo',
          sequence_based_macromolecule: build(
            :modified_uniprot_sbmm,
            heterologous_expression: 'no',
            taxon_id: '12345',
            localisation: 'Irgendwo',
            organism: 'Ailurus Fulgens',
            strain: 'SomeStrain',
            tissue: 'Zewa'
          )
        )
      end

      it 'shows some attributes when SBMM is not from uniprot' do
        expect(grape_entity_as_hash.key?(:heterologous_expression)).to be true
        expect(grape_entity_as_hash.key?(:taxon_id)).to be true
        expect(grape_entity_as_hash.key?(:localisation)).to be true
        expect(grape_entity_as_hash.key?(:organism)).to be true
        expect(grape_entity_as_hash.key?(:strain)).to be true
        expect(grape_entity_as_hash.key?(:tissue)).to be true
      end
    end
  end
end
