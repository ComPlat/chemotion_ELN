# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SequenceBasedMacromoleculeAPI do
  include_context 'api request authorization context' 

  describe 'INDEX /api/v1/sequence_based_macromolecules' do
    let(:body_data) do
      file = Rails.root.join("spec/fixtures/uniprot/search_for_ec_2_6_1_7.json")
      File.exist?(file) ? File.read(file) : '{}'
    end

    before do
      stub_request(:get, "https://rest.uniprot.org/uniprotkb/search")
        .with(query: {
          fields: "id,accession,protein_name,organism_name",
          query: "ec:2.6.1.7",
          size: 10,
          sort: "accession desc"
        }).to_return(status: status,
                   body: body_data,
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
    let(:body_data) do
      file = Rails.root.join("spec/fixtures/uniprot/#{uniprot_id}.json")
      File.exist?(file) ? File.read(file) : '{}'
    end

    before do
      stub_request(:get, "https://rest.uniprot.org/uniprotkb/#{uniprot_id}")
        .to_return(status: status,
                   body: body_data,
                   headers: { 'Content-Type' => 'application/json' })
    end

    context 'when API returns a result' do
      let(:uniprot_id) { 'P12345' }

      it 'returns a serialized SBMM' do
        get "/api/v1/sequence_based_macromolecules/#{uniprot_id}"

        result = parsed_json_response['sequence_based_macromolecule']
        expect(result['uniprot_ids'].first).to eq uniprot_id
      end
    end
  end
end
