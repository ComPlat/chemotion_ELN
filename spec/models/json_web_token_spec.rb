# frozen_string_literal: true

require 'rails_helper'

RSpec.describe JsonWebToken do
  let(:payload) { { user_id: 42 } }
  let(:token_generated_time) { Time.utc(2022, 4, 10, 12, 15, 25) }
  let(:token_expiration_time) { Time.utc(2022, 10, 10, 12, 15, 25) }

  before { travel_to(token_generated_time) }

  describe '.encode' do
    let(:claims) { JWT.decode(token, nil, false).first }

    context 'with a known purpose' do
      let(:token) { described_class.encode(payload, 1.day.from_now, purpose: :editor) }

      it 'stores the purpose and the expiry next to the payload' do
        expect(claims).to eq(
          'user_id' => 42, 'purpose' => 'editor', 'exp' => 1.day.from_now.to_i,
        )
      end
    end

    context 'when the expire time is missing' do
      let(:token) { described_class.encode(payload, purpose: :login) }

      it 'expires after six months' do
        expect(Time.zone.at(claims['exp'])).to eq(token_expiration_time)
      end
    end

    context 'when the payload brings its own exp or purpose' do
      let(:token) do
        described_class.encode(payload.merge(exp: 1.year.from_now.to_i, purpose: 'login'), purpose: :editor)
      end

      it 'overrides them' do
        expect(claims).to include('purpose' => 'editor', 'exp' => 6.months.from_now.to_i)
      end
    end

    it 'does not change the given payload' do
      described_class.encode(payload, purpose: :login)
      expect(payload).to eq(user_id: 42)
    end

    it 'rejects an unknown purpose' do
      expect { described_class.encode(payload, purpose: :anything) }.to raise_error(ArgumentError)
    end

    it 'requires a purpose' do
      expect { described_class.encode(payload) }.to raise_error(ArgumentError)
    end
  end

  describe '.decode' do
    subject(:decoded_token) { described_class.decode(token, purpose: :login) }

    let(:token) { described_class.encode(payload, purpose: :login) }

    context 'when the token is valid' do
      it 'returns the payload with indifferent access' do
        expect(decoded_token[:user_id]).to eq(42)
        expect(decoded_token['purpose']).to eq('login')
      end

      it 'returns the expiration time as unix timestamp' do
        expect(Time.zone.at(decoded_token[:exp])).to eq(token_expiration_time)
      end
    end

    context 'when the token was issued for another purpose' do
      let(:token) { described_class.encode(payload, purpose: :editor) }

      it 'raises WrongTokenPurpose, a DecodeError' do
        expect { decoded_token }.to raise_error(Errors::WrongTokenPurpose)
        expect(Errors::WrongTokenPurpose.ancestors).to include(Errors::DecodeError)
      end
    end

    context 'when the token has no purpose (issued before purposes existed)' do
      let(:token) { JWT.encode({ user_id: 42, exp: 1.day.from_now.to_i }, Rails.application.secret_key_base, 'HS256') }

      it 'is rejected' do
        expect { decoded_token }.to raise_error(Errors::WrongTokenPurpose)
      end
    end

    context 'when the jwt is invalid' do
      let(:token) { 'i-am-invalid' }

      it 'raises our own exception' do
        expect { decoded_token }.to raise_error(Errors::DecodeError)
      end
    end

    context 'when the jwt signature is expired' do
      let(:token) { described_class.encode(payload, 1.second.ago, purpose: :login) }

      it 'raises our own exception' do
        expect { decoded_token }.to raise_error(Errors::ExpiredSignature)
      end
    end

    context 'when the jwt is signed with another secret' do
      let(:token) { JWT.encode({ user_id: 42, purpose: 'login' }, 'another-secret', 'HS256') }

      it 'raises our own exception' do
        expect { decoded_token }.to raise_error(Errors::ExpiredSignature)
      end
    end
  end
end
