# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PublicAPI do
  describe 'GET /api/v1/public/ping' do
    before { get('/api/v1/public/ping', params: '', headers: { 'AUTHORIZATION' => 'Bearer qwerty' }) }

    it 'responds 204' do
      expect(response).to have_http_status :no_content
    end
  end

  describe 'POST /api/v1/public/token' do
    subject(:execute_request) { post('/api/v1/public/token', params: params) }

    let(:build_user) { create(:person) }
    let(:params) do
      {
        username: build_user.name_abbreviation,
        password: 'testtest',
      }
    end

    context 'when use case returns a token' do
      before do
        allow(JsonWebToken).to receive(:encode).and_return('my-token')
        execute_request
      end

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'responds a hash with a token' do
        expect(parsed_json_response).to eq({ 'token' => 'my-token' })
      end
    end

    context 'when use case returns nil' do
      before do
        allow(Usecases::Public::BuildToken).to receive(:execute!).and_return(nil)
        execute_request
      end

      it 'responds an error' do
        expect(response).to have_http_status :unauthorized
      end
    end
  end
end
