# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ConverterAPI do
  let(:converter_url) { 'http://converter.test/' }
  let(:user) { create(:person) }
  let(:admin) { create(:person) }
  let(:upload) { fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt')) }

  before do
    config = ActiveSupport::OrderedOptions.new
    config.url = converter_url
    config.profile = 'chemotion'
    config.secret_key = 'secret'
    config.timeout = 30
    allow(Rails.configuration).to receive(:converter).and_return(config)

    admin.profile.update!(data: admin.profile.data.merge('converter_admin' => true))
  end

  describe 'converter_admin gating' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user) # rubocop:disable RSpec/AnyInstance
    end

    it 'rejects a non-admin on conversions' do
      post '/api/v1/converter/conversions', params: { file: upload, format: 'metajson' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects a non-admin on profile restore' do
      post '/api/v1/converter/profiles/restore/p1/1.0'

      expect(response).to have_http_status(:unauthorized)
    end
  end

  context 'when the user is a converter admin' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin) # rubocop:disable RSpec/AnyInstance
    end

    describe 'POST /api/v1/converter/profiles/restore/:id/:version' do
      # The gem's route calls the undefined Labimotion::Converter.restore, so this
      # API has to shadow it.
      it 'forwards the hard flag to converter-app as a JSON body' do
        stub = stub_request(:post, "#{converter_url}profiles/restore/p1/1.0")
               .with(body: { hard: true }.to_json)
               .to_return(
                 status: 200,
                 body: { 'id' => 'p1' }.to_json,
                 headers: { 'Content-Type' => 'application/json' },
               )

        post '/api/v1/converter/profiles/restore/p1/1.0', params: { hard: true }

        expect(response).to have_http_status(:created)
        expect(stub).to have_been_requested
      end

      it 'relays a converter-app failure status instead of a 500' do
        stub_request(:post, "#{converter_url}profiles/restore/p1/1.0").to_return(status: 404, body: 'nope')

        post '/api/v1/converter/profiles/restore/p1/1.0'

        expect(response).to have_http_status(:not_found)
      end
    end

    describe 'POST /api/v1/converter/tables' do
      it 'forwards the ontology and restores the original filename' do
        stub = stub_request(:post, "#{converter_url}tables")
               .with { |req| req.body.include?('name="ontology"') && req.body.include?('CHMO:0000595') }
               .to_return(
                 status: 200,
                 body: { 'metadata' => {} }.to_json,
                 headers: { 'Content-Type' => 'application/json' },
               )

        post '/api/v1/converter/tables', params: { file: upload, ontology: 'CHMO:0000595' }

        expect(response).to have_http_status(:created)
        expect(stub).to have_been_requested
        # converter-app only ever sees the tempfile's name.
        expect(parsed_json_response['metadata']['file_name']).to eq('upload.txt')
      end

      it 'omits the ontology field when none was selected' do
        stub = stub_request(:post, "#{converter_url}tables")
               .with { |req| req.body.exclude?('name="ontology"') }
               .to_return(
                 status: 200,
                 body: { 'metadata' => {} }.to_json,
                 headers: { 'Content-Type' => 'application/json' },
               )

        post '/api/v1/converter/tables', params: { file: upload }

        expect(response).to have_http_status(:created)
        expect(stub).to have_been_requested
      end
    end

    describe 'POST /api/v1/converter/conversions' do
      it 'relays body, content type and disposition from converter-app' do
        stub_request(:post, "#{converter_url}conversions").to_return(
          status: 200,
          body: { 'profile_id' => 'p1' }.to_json,
          headers: {
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment;filename=out.json',
          },
        )

        post '/api/v1/converter/conversions', params: { file: upload, format: 'metajson' }

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response).to eq('profile_id' => 'p1')
        expect(response.headers['Content-Disposition']).to eq('attachment;filename=out.json')
      end

      it 'rejects a request without a file' do
        post '/api/v1/converter/conversions', params: { format: 'metajson' }

        expect(response).to have_http_status(:bad_request)
      end
    end

    describe 'routes left to Labimotion::ConverterAPI' do
      # This API is mounted first, so anything it does not define must cascade to
      # the gem rather than 404.
      it 'cascades GET /profiles to the gem' do
        stub_request(:get, "#{converter_url}profiles").to_return(
          status: 200,
          body: [{ id: 'p1' }].to_json,
          headers: { 'Content-Type' => 'application/json' },
        )

        get '/api/v1/converter/profiles'

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response).to eq('profiles' => [{ 'id' => 'p1' }], 'client' => 'chemotion')
      end

      it 'cascades GET /datasets_units to the gem' do
        get '/api/v1/converter/datasets_units'

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response.first).to include('field', 'label', 'units')
      end
    end
  end
end
