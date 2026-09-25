# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MofAPI do
  include_context 'api request authorization context'

  let(:service_url) { 'http://mof_service:5000/' }
  let(:mof_result) do
    {
      'mofid' => 'test.MOFid-v1.pcu.cat0',
      'mofkey' => 'X.MOFkey-v1.pcu',
      'smiles' => 'C',
      'smiles_nodes' => 'C',
      'smiles_linkers' => '',
      'topology' => 'pcu',
      'cat' => '0',
    }
  end

  before do
    allow(Rails.configuration).to receive(:respond_to?).and_call_original
    allow(Rails.configuration).to receive(:respond_to?).with(:mof_service).and_return(true)
    allow(Rails.configuration).to receive(:mof_service).and_return(
      OpenStruct.new(mof_service_url: service_url, disabled?: false),
    )
  end

  describe 'POST /api/v1/mof/analyze' do
    it 'accepts CIF text and returns MOFid identifiers' do
      stub_request(:post, "#{service_url}analyze")
        .to_return(status: 200, body: mof_result.to_json, headers: { 'Content-Type' => 'application/json' })

      post '/api/v1/mof/analyze', params: { cif: "data_test\n" }, as: :json

      expect(response).to have_http_status(:created)
      expect(parsed_json_response['mofid']).to eq(mof_result['mofid'])
      expect(parsed_json_response['mofkey']).to eq(mof_result['mofkey'])
      expect(parsed_json_response['topology']).to eq('pcu')
    end

    it 'returns 503 when the sidecar is not configured' do
      allow(Rails.configuration).to receive(:mof_service).and_return(
        OpenStruct.new(mof_service_url: nil, disabled?: true),
      )

      post '/api/v1/mof/analyze', params: { cif: "data_test\n" }, as: :json

      expect(response).to have_http_status(:service_unavailable)
    end

    it 'rejects CIF payloads larger than the size limit' do
      oversized = 'x' * (Chemotion::MofAPI::MAX_CIF_BYTES + 1)

      post '/api/v1/mof/analyze', params: { cif: oversized }, as: :json

      expect(response).to have_http_status(:payload_too_large)
    end
  end
end
