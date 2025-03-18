require 'rails_helper'

describe Chemotion::SequenceBasedMacromoleculeSampleAPI do
  include_context 'api request authorization context'

  describe 'INDEX /api/v1/sequence_based_macromolecule_samples' do
    it 'returns a paginated list view of all SBMM-Samples' do

    end
  end

  describe 'GET /api/v1/sequence_based_macromolecule_samples/:id' do
    let(:sample) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:modified_uniprot_sbmm),
        user: logged_in_user # from context above
      )
    end

    it 'returns the given SBMM-Sample' do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"

      expect(response.status).to eq 200

      result = parsed_json_response['sequence_based_macromolecule_sample']
      expect(result['id']).to eq sample.id
    end

    it 'returns the SBMM as part of the sample data' do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"

      expect(response.status).to eq 200
      result = parsed_json_response['sequence_based_macromolecule_sample']
      sbmm = result['sequence_based_macromolecule']

      expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
    end

    it "returns the parent of the sample's SBMM if present" do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"

      expect(response.status).to eq 200
      result = parsed_json_response['sequence_based_macromolecule_sample']
      sbmm = result['sequence_based_macromolecule']
      parent_sbmm = sbmm['parent']

      expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
      expect(parent_sbmm['uniprot_derivation']).to eq 'uniprot'
    end
  end

  describe 'POST /api/v1/sequence_based_macromolecule_samples' do
    before do
      stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
          .to_return(status: 200,
                     body: file_fixture("uniprot/P12345.json").read,
                     headers: { 'Content-Type' => 'application/json' })
    end

    context 'when creating a sample for a Uniprot SBMM' do
      let(:post_for_uniprot_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration: '0.5',
          molarity: '1.2345',
          volume_as_used: '3.21',
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot',
            identifier: 'P12345',
          }
        }
      end
      it 'creates a SBMM-Sample record' do
        expect { 
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_uniprot_sbmm
        }.to change(SequenceBasedMacromoleculeSample, :count).by(1)
      end

      it 'creates the SBMM record if necessary' do
        expect {
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_uniprot_sbmm
        }.to change(SequenceBasedMacromolecule, :count).by(1)
      end

      it 'uses existing SBMM records if possible' do
        expect {
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_uniprot_sbmm
        }.to change(SequenceBasedMacromolecule, :count).by(1)
         .and change(SequenceBasedMacromoleculeSample, :count).by(1)

        expect {
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_uniprot_sbmm
        }.to change(SequenceBasedMacromolecule, :count).by(0)
         .and change(SequenceBasedMacromoleculeSample, :count).by(1)
      end
    end

    context 'when creating a modified SBMM based on a uniprot SBMM' do
      let(:post_for_modified_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration: '0.5',
          molarity: '1.2345',
          volume_as_used: '3.21',
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot_modified',
            molecular_weight: 123,
            parent_identifier: 'P12345',
            sequence: 'MODIFIEDSEQUENCE',
            protein_sequence_modification_attributes: {
              modification_n_terminal: true,
              modification_n_terminal_details: 'Some details'
            },
            post_translational_modification_attributes: {
              phosphorylation_enabled: true,
              phosphorylation_ser_enabled: true
            }
          }
        }
      end
      context 'when the uniprot SBMM is not in ELN' do
        before do
          stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
              .to_return(status: 200,
                         body: file_fixture("uniprot/P12345.json").read,
                         headers: { 'Content-Type' => 'application/json' })
        end
        it 'fetches the uniprot SBMM and creates a record for it' do
          expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).to be_nil
          expect do
            post "/api/v1/sequence_based_macromolecule_samples", params: post_for_modified_sbmm
          end.to change(SequenceBasedMacromolecule, :count).by(2)
             .and change(SequenceBasedMacromoleculeSample, :count).by(1)

          expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).not_to be_nil
        end
      end

      it 'creates a new SBMM with reference to the parent SBMM' do
        create(:uniprot_sbmm)

        post "/api/v1/sequence_based_macromolecule_samples", params: post_for_modified_sbmm
        expect(response.status).to eq 201

        result = parsed_json_response['sequence_based_macromolecule_sample']

        expect(result['sequence_based_macromolecule']['sequence']).to eq 'MODIFIEDSEQUENCE'
        expect(result['sequence_based_macromolecule']['parent']['primary_accession']).to eq 'P12345'
      end

      it 'creates a new sample under the new SBMM' do
        create(:uniprot_sbmm)
        expect do
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_modified_sbmm
        end.to change(SequenceBasedMacromolecule, :count).by(1)
           .and change(SequenceBasedMacromoleculeSample, :count).by(1)
      end
    end

    context 'when creating a modified SBMM based on a non-uniprot SBMM' do
      let(:non_uniprot_sbmm) { create(:non_uniprot_sbmm) }
      let(:post_for_child_of_non_uniprot_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration: '0.5',
          molarity: '1.2345',
          volume_as_used: '3.21',
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot_modified',
            molecular_weight: 123,
            parent_identifier: non_uniprot_sbmm.id,
            sequence: 'MODIFIEDSEQUENCE',
            protein_sequence_modification_attributes: {
              modification_n_terminal: true,
              modification_n_terminal_details: 'Some details'
            },
            post_translational_modification_attributes: {
              phosphorylation_enabled: true,
              phosphorylation_ser_enabled: true
            }
          }
        }
      end

      it 'creates a new SBMM with the provided data' do
        non_uniprot_sbmm # create this before, so it does not mess up our count
        expect {
          post "/api/v1/sequence_based_macromolecule_samples", params: post_for_child_of_non_uniprot_sbmm
        }.to change(SequenceBasedMacromolecule, :count).by(1)
         .and change(SequenceBasedMacromoleculeSample, :count).by(1)

        sample = parsed_json_response['sequence_based_macromolecule_sample']
        sbmm = sample['sequence_based_macromolecule']
        parent_sbmm = sbmm['parent']

        expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
        expect(parent_sbmm['uniprot_derivation']).to eq 'uniprot_unknown'
      end
    end
  end
end
