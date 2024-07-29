# frozen_string_literal: true

require 'rails_helper'
require 'webmock/rspec'

RSpec.describe 'Indigo API', type: :request do
  let!(:unauthorized_user) { create(:person) }
  let(:molfile_structure) { 'C1=CC=CC=C1' }
  let(:service_url) { Rails.configuration.indigo_service.indigo_service_url }
  let(:output_format_convert) { 'chemical/x-mdl-molfile' }
  let(:output_format_render) { 'image/svg+xml' }

  # Mock Warden Authentication for unauthorized user
  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
    allow(warden_authentication_instance).to receive(:current_user).and_return(unauthorized_user)
    allow(Rails.configuration.indigo_service).to receive(:indigo_service_url).and_return(service_url)
  end

  describe 'POST /indigo/structure/render' do
    let(:url) { 'http://indigo_service/v2/indigo/render' }
    let(:request_data) { { struct: molfile_structure, output_format: output_format_convert }.to_json }

    context 'when the request success' do
      before do
        # Stubbing the external request to the Indigo service
        stub_request(:post, 'http://indigo_service/v2/indigo/render')
          .with(
            body: '{"struct":"C1=CC=CC=C1","output_format":"image/svg+xml"}',
            headers: {
              'Accept' => '*/*',
              'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
              'Content-Type' => 'application/json',
              'User-Agent' => 'Ruby',
            },
          )
          .to_return(status: 200, body: '', headers: {})
      end

      it 'returns the rendered structure' do
        post '/api/v1/molecules/indigo/structure/render',
             params: { struct: molfile_structure, output_format: output_format_render }

        expect(response).to have_http_status(:success)
      end
    end

    context 'when the request fails' do
      before do
        stub_request(:post, 'http://indigo_service/v2/indigo/render')
          .with(
            body: '{"struct":"any random value","output_format":"ASdf"}',
            headers: {
              'Accept' => '*/*',
              'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
              'Content-Type' => 'application/json',
              'User-Agent' => 'Ruby',
            },
          )
          .to_return(status: 400, body: '', headers: {})
      end

      it 'returns an error message' do
        post '/api/v1/molecules/indigo/structure/render',
             params: { struct: 'any random value', output_format: 'ASdf' }

        expect(JSON.parse(response.body)['error']).to eq('Failed to contact Indigo service')
      end
    end
  end
end
