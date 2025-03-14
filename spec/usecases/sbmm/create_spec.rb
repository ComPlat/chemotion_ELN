# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Sbmm::Create do
  describe '#find_or_create_by' do
    context 'when uniprot_derivation == uniprot' do
      let(:post_for_uniprot_sbmm) do
        {
          sbmm_type: 'protein',
          sbmm_subtype: 'unmodified',
          uniprot_derivation: 'uniprot',
          identifier: 'P12345'
        }
      end

      it 'creates an unknown protein based on uniprot data' do
        stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
          .to_return(status: 200,
                     body: file_fixture("uniprot/P12345.json").read,
                     headers: { 'Content-Type' => 'application/json' })
        expect { described_class.new.find_or_create_by(post_for_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        expect(SequenceBasedMacromolecule.last.primary_accession).to eq 'P12345'
      end

      it 'returns a protein that already exists in ELN' do
        result = nil
        uniprot_sbmm = create(:uniprot_sbmm)
        expect { result = described_class.new.find_or_create_by(post_for_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(0)
        expect(result.id).to be uniprot_sbmm.id
      end
    end

    context 'when uniprot_derivation == uniprot_modified' do
      it 'returns a protein that already exists in ELN' do
        result = nil
        modified_uniprot_sbmm = create(:modified_uniprot_sbmm)
        expect { result = described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(0)
        expect(result.id).to eq modified_uniprot_sbmm.id
      end

      it 'creates a new protein based on user input' do

      end
    end

    context 'when uniprot_derivation == uniprot_unknown' do
      it 'returns a protein that already exists in ELN' do

      end

      it 'creates a new protein based on user input' do

      end
    end
  end
end
