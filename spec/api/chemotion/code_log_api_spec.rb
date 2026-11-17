# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::CodeLogAPI do
  let(:user) { create(:person) }
  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }
  let!(:code_log) { create(:code_log, source: 'sample', source_id: 1) }

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
    allow(warden_authentication_instance).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/code_logs/generic' do
    it 'finds a code log by its full 40-digit code' do
      get '/api/v1/code_logs/generic', params: { code: code_log.reload.value }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig('code_log', 'id')).to eq(code_log.id)
    end

    it 'finds a code log by its short code' do
      get '/api/v1/code_logs/generic', params: { code: code_log.reload.value_sm }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig('code_log', 'id')).to eq(code_log.id)
    end

    it 'returns 404 for a 6-digit code' do
      get '/api/v1/code_logs/generic', params: { code: '123456' }

      expect(response).to have_http_status(:not_found)
    end
  end
end
