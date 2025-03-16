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
        expect(result.map { |entry| entry['accessions'] }).to eq %w[X2BBW9 W8C121 W8BRD0]
      end
    end
  end

  describe 'GET /api/v1/sequence_based_macromolecules/:identifier' do
    context 'when API returns a result' do
      before do
        stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
          .to_return(status: 200,
                     body: file_fixture("uniprot/P12345.json").read,
                     headers: { 'Content-Type' => 'application/json' })
      end

      let(:identifier) { 'P12345' }

      it 'returns a serialized SBMM' do
        get "/api/v1/sequence_based_macromolecules/#{identifier}?type=uniprot"

        expect(response.status).to eq 200
        result = parsed_json_response['sequence_based_macromolecule']
        expect(result['accessions'].first).to eq identifier
      end
    end
  end
end
