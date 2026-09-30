# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MofAPI do
  include_context 'api request authorization context'

  let(:service_url) { 'http://converter:4000/' }
  let(:converter_response) do
    {
      'mofid.mofid' => 'test.MOFid-v1.pcu.cat0',
      'mofid.mofkey' => 'X.MOFkey-v1.pcu',
      'mofid.smiles' => 'C',
      'mofid.smiles_nodes' => 'C',
      'mofid.smiles_linkers' => '',
      'mofid.topology' => 'pcu',
      'mofid.cat' => '0',
    }
  end

  # Mirrors what config_for returns in production, so #mof_service_url and the
  # #disabled? predicate (via OrderedOptions#method_missing) behave for real.
  def mof_config(url:, disabled:)
    ActiveSupport::OrderedOptions.new.tap do |config|
      config.mof_service_url = url
      # config/default_missing.yml stores a literal "disabled?" key because
      # OrderedOptions#disabled? just reads self["disabled?"]; mirror that.
      config.disabled = disabled
      config[:disabled?] = disabled
    end
  end

  before do
    allow(Rails.configuration).to receive(:respond_to?).and_call_original
    allow(Rails.configuration).to receive(:respond_to?).with(:mof_service).and_return(true)
    allow(Rails.configuration).to receive(:mof_service).and_return(
      mof_config(url: service_url, disabled: false),
    )
  end

  describe 'POST /api/v1/mof/analyze' do
    it 'accepts CIF text and returns MOFid identifiers' do
      stub_request(:post, "#{service_url}mofid")
        .to_return(status: 200, body: converter_response.to_json, headers: { 'Content-Type' => 'application/json' })

      post '/api/v1/mof/analyze', params: { cif: "data_test\n" }, as: :json

      expect(response).to have_http_status(:created)
      expect(parsed_json_response).to include(
        'mofid' => converter_response['mofid.mofid'],
        'mofkey' => converter_response['mofid.mofkey'],
        'topology' => 'pcu',
      )
    end

    it 'returns 503 when the converter is not configured' do
      allow(Rails.configuration).to receive(:mof_service).and_return(
        mof_config(url: nil, disabled: true),
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
