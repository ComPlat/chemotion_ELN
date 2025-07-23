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
          primary_accession: 'P12345'
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

      it 'raises an error if the given primary_accession does not match accession format' do
        input = post_for_uniprot_sbmm
        input[:primary_accession] = 'foobar'

        expect { described_class.new.find_or_create_by(input) }.to raise_error(ArgumentError)
      end
    end

    context 'when uniprot_derivation == uniprot_modified' do
      let(:post_for_modified_uniprot_sbmm) do
        {
          sbmm_type: 'protein',
          sbmm_subtype: 'unmodified', # no idea if thats semantically true
          uniprot_derivation: 'uniprot_modified',
          parent_identifier: 'P12345',
          sequence: 'ABC12345',
          short_name: 'FooBar',
          post_translational_modification_attributes: {
            phosphorylation_enabled: true,
            phosphorylation_ser_enabled: true,
            phosphorylation_ser_details: 'Something something'
          }
        }
      end
      it 'returns a protein that already exists in ELN, found by searching for ALL fields of the input SBMM' do
        first_invocation_result = nil
        second_invocation_result = nil
        parent = create(:uniprot_sbmm, primary_accession: 'P12345')
        expect { first_invocation_result = described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        # a second invocation will return the existing sbmm from database
        expect { second_invocation_result = described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(0)
        expect(first_invocation_result.id).to eq second_invocation_result.id
      end

      it 'raises an error if the sequence and modifications of the protein already exist in another protein' do
        slightly_different_post_data = post_for_modified_uniprot_sbmm.merge(short_name: 'something Different')

        parent = create(:uniprot_sbmm, primary_accession: 'P12345')
        expect { described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)

        expect { described_class.new.find_or_create_by(slightly_different_post_data) }.to raise_error(Usecases::Sbmm::Errors::CreateConflictError)
      end

      it 'creates a new protein based on user input if no conflicting protein is present' do
        parent = create(:uniprot_sbmm)
        expect { described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
      end

      it 'creates a parent SBMM if the parent identifier is a uniprot accession that is not in ELN' do
        stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
          .to_return(status: 200,
                     body: file_fixture("uniprot/P12345.json").read,
                     headers: { 'Content-Type' => 'application/json' })

        expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).to be nil
        expect { described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(2)
        expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).not_to be nil
      end

      it 'creates entries for PSM/PTM if necessary' do
        parent = create(:uniprot_sbmm)
        expect {
          sbmm = described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm)
        }.to change(SequenceBasedMacromolecule, :count).by(1)
         .and change(PostTranslationalModification, :count).by(1)
      end

      it 'does not reuse existing records for PSM/PTM' do
        existing_ptm = PostTranslationalModification.create(
          phosphorylation_enabled: true,
          phosphorylation_ser_enabled: true,
          phosphorylation_ser_details: 'Something something'
        )

        sbmm = nil
        parent = create(:uniprot_sbmm)
        expect { sbmm = described_class.new.find_or_create_by(post_for_modified_uniprot_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        expect(sbmm.post_translational_modification.id).not_to eq existing_ptm.id
      end
    end

    context 'when uniprot_derivation == uniprot_unknown' do
      let(:post_for_unknown_sbmm) do
        {
          sbmm_type: 'protein',
          sbmm_subtype: 'unmodified', # no idea if thats semantically true
          uniprot_derivation: 'uniprot_unknown',
          sequence: 'ABC12345',
          short_name: 'FooBar',
          post_translational_modification_attributes: {
            phosphorylation_enabled: true,
            phosphorylation_ser_enabled: true,
            phosphorylation_ser_details: 'Something something'
          }
        }
      end
      it 'returns a protein that already exists in ELN, found by searching for ALL fields of the input SBMM' do
        first_invocation_result = nil
        second_invocation_result = nil
        expect { first_invocation_result = described_class.new.find_or_create_by(post_for_unknown_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        # a second invocation will return the existing sbmm from database
        expect { second_invocation_result = described_class.new.find_or_create_by(post_for_unknown_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(0)
        expect(first_invocation_result.id).to eq second_invocation_result.id
      end

      it 'raises an error if the sequence and modifications of the protein already exist in another protein' do
        slightly_different_post_data = post_for_unknown_sbmm.merge(short_name: 'something Different')

        expect { described_class.new.find_or_create_by(post_for_unknown_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        expect { described_class.new.find_or_create_by(slightly_different_post_data) }.to raise_error(Usecases::Sbmm::Errors::CreateConflictError)
      end

      it 'creates a new protein based on user input if no conflicting protein is present' do
        expect { described_class.new.find_or_create_by(post_for_unknown_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
      end

      it 'creates entries for PSM/PTM if necessary' do
        parent = create(:uniprot_sbmm)
        expect {
          sbmm = described_class.new.find_or_create_by(post_for_unknown_sbmm)
        }.to change(SequenceBasedMacromolecule, :count).by(1)
         .and change(PostTranslationalModification, :count).by(1)
      end

      it 'does not reuse existing records for PSM/PTM' do
        existing_ptm = PostTranslationalModification.create(
          phosphorylation_enabled: true,
          phosphorylation_ser_enabled: true,
          phosphorylation_ser_details: 'Something something'
        )

        sbmm = nil
        expect { sbmm = described_class.new.find_or_create_by(post_for_unknown_sbmm) }.to change(SequenceBasedMacromolecule, :count).by(1)
        expect(sbmm.post_translational_modification.id).not_to eq existing_ptm.id
      end
    end
  end
end
