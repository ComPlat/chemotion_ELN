# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Base do
  subject(:select_options_base) { described_class.new }

  describe '#option_for' do
    it 'strips values for labels and values' do
      expect(select_options_base.option_for(' VALUE ')).to eq(value: 'VALUE', label: 'VALUE')
    end
  end

  describe '#options_for' do
    it 'maps values to options' do
      expect(select_options_base.options_for(%w[A B])).to eq([{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }])
    end
  end

  describe '#pseudo_ontology_option_for' do
    it 'adds ontology-shaped metadata' do
      expect(select_options_base.pseudo_ontology_option_for(active: true, role: 'method', value: 'HPLC')).to include(
        active: true,
        ontology_id: 'HPLC',
        roles: { method: [{}] },
      )
    end
  end

  describe '#titlecase_options_for' do
    it 'titlecases labels' do
      expect(select_options_base.titlecase_options_for(['oil_bath'])).to eq([{ value: 'oil_bath', label: 'Oil Bath' }])
    end
  end

  describe '#molecule_option' do
    let(:molecule) { create(:molecule, iupac_name: 'Water') }

    it 'maps molecules to options' do
      expect(select_options_base.molecule_option(molecule)).to include(
        id: molecule.id,
        value: molecule.id,
        label: 'Water',
      )
    end

    it 'returns an empty hash without a molecule' do
      expect(select_options_base.molecule_option(nil)).to eq({})
    end
  end

  describe '#molecular_entity_options' do
    let(:molecule) { create(:molecule, iupac_name: 'Water') }

    it 'maps molecules to options' do
      expect(select_options_base.molecular_entity_options([molecule])).to include(hash_including(value: molecule.id))
    end
  end

  describe '#sample_minimal_option' do
    let(:sample) { create(:valid_sample) }

    let(:expected_sample_option) do
      {
        id: sample.id,
        value: sample.id,
        label: sample.preferred_label,
        acts_as: 'SUPERSOLVENT',
      }
    end

    it 'returns options for sample' do
      expect(select_options_base.sample_minimal_option(sample, 'SUPERSOLVENT')).to eq(expected_sample_option)
    end

    it 'returns an empty hash without a sample' do
      expect(select_options_base.sample_minimal_option(nil, 'SAMPLE')).to eq({})
    end
  end

  describe '#sample_info_option' do
    let(:sample) { create(:valid_sample) }

    it 'returns an empty hash without a sample' do
      expect(select_options_base.sample_info_option(nil, 'SAMPLE')).to eq({})
    end

    it 'maps samples to detailed options' do
      expect(select_options_base.sample_info_option(sample, 'SAMPLE')).to include(
        id: sample.id,
        value: sample.id,
        acts_as: 'SAMPLE',
        unit_amounts: hash_including(:mg, :mmol, :ml),
      )
    end
  end

  describe '#samples_info_options' do
    let(:sample) { create(:valid_sample) }

    it 'maps samples to detailed options' do
      expect(select_options_base.samples_info_options([sample], 'SAMPLE')).to include(hash_including(
                                                                                        { amount: Hash,
                                                                                          sample_svg_file: nil,
                                                                                          icon: nil },
                                                                                      ))
    end
  end

  describe '#solvent_options_for' do
    subject(:solvent_options) { select_options_base.solvent_options_for(reaction_process: reaction_process) }

    let(:diverse_solvent) { create(:diverse_solvent) }
    let(:reaction_process) { create(:sample_process) }

    before do
      diverse_solvent
    end

    it 'returns diverse solvents for sample processes' do
      expect(solvent_options).to include(
        hash_including(value: diverse_solvent.id, acts_as: 'DIVERSE_SOLVENT'),
      )
    end
  end
end
