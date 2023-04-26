# frozen_string_literal: true

# rubocop:disable Rails/DurationArithmetic

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

  describe 'GET /api/v1/public/download' do
    let(:user) do
      create(:user)
    end

    let(:attachment) do
      create(:attachment, attachable: user)
    end

    let(:token) do
      JWT.encode(
        {
          att_id: attachment.id,
          user_id: user.id,
          exp: (Time.zone.now + 15.minutes).to_i,
        },
        Rails.application.secrets.secret_key_base,
      )
    end

    context 'when token is present and attachment exists' do
      before { get('/api/v1/public/download', params: { token: token }) }

      it 'responds with 200 status code' do
        expect(response).to have_http_status :ok
      end

      it 'returns the attachment data as binary' do
        expect(response.headers['Content-Type']).to eq('application/octet-stream')
        expect(response.headers['Content-Disposition']).to eq("attachment; filename=\"#{attachment.filename}\"")
        expect(response.body).to eq(attachment.read_file)
      end
    end

    context 'when token is missing' do
      before { get('/api/v1/public/download') }

      it 'responds with 401 status code' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when attachment is missing' do
      let(:invalid_token) do
        JWT.encode(
          {
            att_id: attachment.id + 1,
            user_id: user.id,
            exp: (Time.zone.now + 15.minutes).to_i,
          },
          Rails.application.secrets.secret_key_base,
        )
      end

      before { get('/api/v1/public/download', params: { token: invalid_token }) }

      it 'responds with 401 status code' do
        expect(response).to have_http_status :unauthorized
      end
    end
  end

  describe 'GET /api/v1/public/callback' do
    let(:attachment) { create(:attachment) }
    let(:user) { create(:user) }
    let(:jwt_secret) { Rails.application.secrets.secret_key_base }

    context 'when key is nil' do
      before { get('/api/v1/public/callback', params: { key: nil }) }

      it 'responds with status 401' do
        expect(response).to have_http_status :unauthorized
      end

      it 'responds with error message' do
        expect(parsed_json_response).to eq({ 'error' => '401 Unauthorized' })
      end
    end

    context 'when document is being edited' do
      let(:jwt_payload) { { att_id: attachment.id, user_id: user.id } }
      let(:jwt_token) { JWT.encode(jwt_payload, jwt_secret) }

      before { get('/api/v1/public/callback', params: { key: jwt_token, status: 1 }) }

      it 'responds with status 200' do
        expect(response).to have_http_status :ok
      end

      it 'responds with error 0' do
        expect(parsed_json_response).to eq({ 'error' => 0 })
      end
    end
  end
end

# rubocop:enable Rails/DurationArithmetic
