# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::GateAPI do
  let(:user) do
    create(:user, first_name: 'Person', last_name: 'Transmitting')
  end
  let(:receiver) do
    create(:user, first_name: 'Person', last_name: 'Receiving')
  end

  let(:c1) { create(:collection, user_id: user.id) }
  let(:s1) { create(:sample) }
  let(:c2) { create(:collection, user_id: receiver.id) }

  let(:payload) do
    {
      collection: c1,
      iss: user.email,
      origin: API::TARGET,
      exp: 7.days.from_now.to_i,
    }
  end
  let(:token) { JWT.encode payload, Rails.application.secrets.secret_key_base }
  let(:headers) do
    { 'AUTHORIZATION' => "Bearer #{token}", 'Origin' => API::TARGET }
  end

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user) # rubocop:disable RSpec/AnyInstance
  end

  describe 'GET /api/v1/gate/ping/' do
    before do
      get '/api/v1/gate/ping/', headers: headers
    end

    context 'when ping API target' do
      it 'returns ok' do
        expect(response).to have_http_status :ok
      end
    end
  end

  describe 'jwt' do
    before do
      get "/api/v1/gate/jwt/new.json?collection_id=#{c1.id}&origin=#{API::TARGET}"
    end

    it 'returns a jwt' do
      jwt = JSON.parse(response.body)&.fetch('jwt', nil)
      secret = Rails.application.secrets.secret_key_base
      expect(JWT.decode(jwt, secret)[0]).to include(
        'collection' => c1.id, 'iss' => user.email, 'origin' => API::TARGET,
      )
    end
  end

  describe 'register_repo' do
    before do
      get '/api/v1/gate/register_repo/', params: { token: token }
    end

    context 'when register repo' do
      it 'returns ok' do
        expect(response).to have_http_status :found
      end
    end
  end

  describe 'register_gate' do
    let(:gate_params) do
      { collection_id: c1.id, destination: API::TARGET, token: 'qwerty' }
    end

    describe 'registering new gate' do
      before do
        post('/api/v1/gate/register_gate.json', params: gate_params)
      end

      it 'persists a jwt' do
        acc_tok = AuthenticationKey.find_by(
          user_id: user.id, role: "gate out #{c1.id}",
        )
        expect(acc_tok).not_to be_nil
        expect(acc_tok&.token).to eq 'qwerty'
      end
    end
  end
end
