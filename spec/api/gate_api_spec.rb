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

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user)
      .and_return(user)
  end

  context 'remote gate properly registered' do
    let(:key) do
      create(:authentication_key, user_id: user.id, role: "gate out #{c1.id}")
    end

    describe 'transmitting' do
      before do
        s1.collections << c1
        s1.save!
        get "/api/v1/gate/transmitting/#{c1.id}"
      end

      # it 'has a jwt' do
      #   expect(
      #     AuthenticationKey.find_by(user_id: user.id, role:"gate out #{c1.id}")
      #   ).to_not be_nil
      # end
      # it 'creates json export data of the contained element' do
      #
      # end
      #
      # it 'creates multipart upload file' do
      #
      # end
    end
  end

  describe :jwt do
    before do
      get URI.encode("/api/v1/gate/jwt/new.json?collection_id=#{c1.id}&origin=http://localhost:3000")
    end

    it 'returns a jwt' do
      jwt = JSON.parse(response.body)&.fetch('jwt', nil)
      secret = Rails.application.secrets.secret_key_base
      expect(JWT.decode(jwt, secret)[0]).to include(
        'collection' => c1.id, 'iss' => user.email, 'origin' => 'http://localhost:3000'
      )
    end
  end

  describe 'register_gate' do
    let(:gate_params) do
      { collection_id: c1.id, destination: 'http://www.chemotion.net', token: 'qwerty' }
    end

    describe 'registering new gate' do
      before do
        post('/api/v1/gate/register_gate.json', params: gate_params)
      end

      it 'persists a jwt' do
        acc_tok = AuthenticationKey.find_by(
          user_id: user.id, role: "gate out #{c1.id}"
        )
        expect(acc_tok).not_to be_nil
        expect(acc_tok&.token).to eq 'qwerty'
      end
    end
  end
end
