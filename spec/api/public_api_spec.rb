require 'rails_helper'

describe Chemotion::PublicAPI do
  include Rack::Test::Methods

  describe 'GET /api/v1/public/samples' do
    let(:s1)   { create(:sample) }
    let(:s2)   { create(:sample) }
    let(:s3)   { create(:sample) }
    let(:c1)   { create(:collection, label: 'chemotion.net') }
    let(:c2)   { create(:collection, label: 'Other') }
    let(:akey) { create(:authentication_key) }

    context 'with valid auth token' do
      before do
        CollectionsSample.create!(sample: s1, collection: c1)
        CollectionsSample.create!(sample: s2, collection: c1)
        CollectionsSample.create!(sample: s3, collection: c2)
        header 'Auth-Token', akey.token
        get '/api/v1/public/samples'
      end

      it 'returns all public samples' do
        body = JSON.parse(last_response.body)
        expect(body.to_s).to include s1.name
        expect(body.to_s).to include s2.name
      end
    end

    context 'with invalid auth token' do
      before do
        header 'Auth-Token', akey.token + "p"
        get '/api/v1/public/samples'
      end

      it 'responds with 401 status code' do
        expect(last_response.status).to eq 401
      end
    end
  end
end
