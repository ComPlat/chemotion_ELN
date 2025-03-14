# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SequenceBasedMacromoleculeAPI do
  include_context 'api request authorization context' 
  before do
    stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
      .to_return(status: status,
                 body: file_fixture("uniprot/P12345.json"),
                 headers: { 'Content-Type' => 'application/json' })
  end

  describe 'INDEX /api/v1/sequence_based_macromolecules' do
    before do
      stub_request(:get, "https://rest.uniprot.org/uniprotkb/search")
        .with(query: {
          fields: "id,accession,protein_name,organism_name",
          query: "ec:2.6.1.7",
          size: 10,
          sort: "accession desc"
        }).to_return(status: status,
                   body: file_fixture("uniprot/search_for_ec_2_6_1_7.json"),
                   headers: { 'Content-Type' => 'application/json' })
    end

    context 'when API returns a result' do
      it 'returns serialized search results' do
        get "/api/v1/sequence_based_macromolecules", params: { search_term: "2.6.1.7", search_field: "ec" }

        result = parsed_json_response['search_results']
        expect(result.count).to eq 3
        expect(result.map { |entry| entry['uniprot_id'] }).to eq %w[X2BBW9 W8C121 W8BRD0]
      end
    end
  end

  describe 'GET /api/v1/sequence_based_macromolecules/:uniprot_id' do
    context 'when API returns a result' do
      let(:uniprot_id) { 'P12345' }

      it 'returns a serialized SBMM' do
        get "/api/v1/sequence_based_macromolecules/#{uniprot_id}"

        result = parsed_json_response['sequence_based_macromolecule']
        expect(result['uniprot_ids'].first).to eq uniprot_id
      end
    end
  end

  describe 'POST /api/v1/sequence_based_macromolecules' do
    let(:post_for_uniprot_sbmm) do
      {
        sbmm_type: 'protein',
        sbmm_subtype: 'unmodified',
        uniprot_derivation: 'uniprot',
        identifier: 'P12345',
        sample_attributes: {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration: '0.5',
          molarity: '1.2345',
          volume_as_used: '3.21'
        }
      }
    end

    context 'when creating a uniprot SBMM' do
      it 'creates a SBMM record' do
        expect { post "/api/v1/sequence_based_macromolecules", params: post_for_uniprot_sbmm }.to(
          change(SequenceBasedMacromolecule, :count).by(1)
        )
      end

      it 'saves the sample under the new SBMM record' do
        post "/api/v1/sequence_based_macromolecules", params: post_for_uniprot_sbmm

        expect(response.status).to eq 201
        body = parsed_json_response

        expect(SequenceBasedMacromoleculeSample.find())
      end
    end

    context 'when creating a modified SBMM based on a uniprot SBMM' do
      context 'when the uniprot SBMM is not in ELN' do
        it 'fetches the uniprot SBMM and creates a record for it' do

        end
      end

      it 'creates a new SBMM with reference to the parent SBMM' do

      end

      it 'creates a new sample under the new SBMM' do

      end
    end

    context 'when creating a modified SBMM based on a non-uniprot SBMM' do

    end

    context 'when creating a non-uniprot SBMM' do

    end

    context 'when creating a duplicate SBMM' do
      it 'creates only the sample and returns the existing SBMM' do

      end
    end
  end
end
