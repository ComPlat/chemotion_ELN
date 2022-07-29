# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JsonWebToken do
  after { travel_back }

  let(:user_id) { 42 }
  let(:expected_token) do
    'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0MiwiZXhwIjoxNjY1NDA0MTI1fQ.jd-274lUfOejePcgYFOMQwiLuYanADMHhlFAPpAte_I'
  end
  let(:expected_timestamp) { 1_665_404_125 }
  let(:token_generated_time)  { Time.utc(2022, 4, 10, 12, 15, 25) }
  let(:token_expiration_time) { Time.utc(2022, 10, 10, 12, 15, 25) }
  let(:token_expired_time)    { Time.utc(2022, 10, 10, 12, 15, 25) }

  describe '.encode' do
    subject(:encoded_token) { described_class.encode(payload, exp) }

    let(:payload) { { user_id: user_id } }
    let(:exp) { 6.months.from_now }

    before { travel_to(token_generated_time) }

    it 'returns a json web token' do
      expect(encoded_token).to eq(expected_token)
    end

    context 'when expire time missing' do
      subject(:encoded_token) { described_class.encode(payload) }

      it 'returns a json web token with default expire date' do
        expect(encoded_token).to eq(expected_token)
      end
    end
  end

  describe '.decode' do
    subject(:decoded_token) { described_class.decode(token) }

    let(:token) { expected_token }

    context 'when token is valid' do
      before { travel_to(token_generated_time) }

      it 'returns a hash' do
        expect(decoded_token).to be_kind_of(Hash)
      end

      it 'returns correct user_id' do
        expect(decoded_token[:user_id]).to eq(user_id)
      end

      it 'returns correct expiration time as unix timestamp' do
        expect(decoded_token[:exp]).to eq(expected_timestamp)
      end

      it 'returns correct expiration time' do
        actual_time = Time.at(decoded_token[:exp])
        expect(actual_time).to eq(token_expiration_time)
      end
    end

    context 'when jwt is invalid' do
      let(:token) { 'i-am-invalid' }

      it 'raises our own exception' do
        expect { decoded_token }.to raise_error(Errors::DecodeError)
      end
    end

    context 'when jwt signature is expired' do
      before { travel_to(token_expired_time) }

      it 'raises our own exception' do
        expect { decoded_token }.to raise_error(Errors::ExpiredSignature)
      end
    end
  end
end
