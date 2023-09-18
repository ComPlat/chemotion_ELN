# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::VersionAPI do
  include_context 'api request authorization context'

  let(:authorized_user) { create(:person) }
  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }
  let!(:c) { create(:collection) }
  let!(:sample) { create(:sample, name: 'JB-R581-A') }
  let!(:reaction) { create(:reaction, name: 'dienophile') }

  context 'authorized user logged in' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(authorized_user)
    end

    describe 'GET /api/v1/versions/samples/:id' do
      context 'with appropriate permissions' do

        before do
          get "/api/v1/versions/samples/#{sample.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns the right version of the given sample' do
          expect(JSON.parse(response.body)['versions'][0]['n']).to eq sample.name
        end
      end
    end

    describe 'GET /api/v1/versions/reactions/:id' do
      context 'with appropriate permissions' do

        before do
          get "/api/v1/versions/reactions/#{reaction.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns the right version of the given reaction' do
          expect(JSON.parse(response.body)['versions'][0]['n']).to eq reaction.name
        end
      end
    end
  end
end
