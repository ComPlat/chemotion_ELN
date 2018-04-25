# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::GateAPI do
  let(:user) {
    create(:user, first_name: 'Person', last_name: 'Transmitting')
  }
  let(:receiver) {
    create(:user, first_name: 'Person', last_name: 'Receiving')
  }

  let(:c1) { create(:collection, user_id: user.id) }
  let(:s1) { create(:sample) }
  let(:c2) { create(:collection, user_id: receiver.id) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user)
      .and_return(user)
  end

  context 'remote gate properly registered' do
    let(:key) {
      create(:authentication_key, user_id: user.id, role: "gate out #{c1.id}")
    }
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
      get "/api/v1/gate/jwt/new.json?collection_id=#{c1.id}&origin=eln.edu"
    end
    it 'returns a jwt' do
      jwt = JSON.parse(response.body)&.fetch('jwt',nil)
      secret = Rails.application.secrets.secret_key_base
      expect(JWT.decode(jwt, secret)[0]).to eq({
        'collection' => c1.id, 'iss' => user.email, 'origin' => 'eln.edu'
      })
    end


  end
  describe 'register_gate' do
    let(:gate_params) {
      { collection_id: c1.id, destination: 'www.chemotion.net', token: 'qwerty'}
    }
    describe 'registering new gate' do
      before do
        post('/api/v1/gate/register_gate.json', gate_params)
      end
      it 'persists a jwt' do
        acc_tok = AuthenticationKey.find_by(
          user_id: user.id, role:"gate out #{c1.id}"
        )
        expect(acc_tok).to_not be_nil
        expect(acc_tok&.token).to eq 'qwerty'
      end
    end
  end
end
