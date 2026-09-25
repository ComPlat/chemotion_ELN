# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Authentication::JwtAuthenticatableStrategy do
  def build_strategy(authorization_header)
    env = Rack::MockRequest.env_for('/', 'HTTP_AUTHORIZATION' => authorization_header)
    described_class.new(env, :user)
  end

  describe '#valid?' do
    it 'is valid when an Authorization header is present' do
      strategy = build_strategy('Bearer some-token')

      expect(strategy.valid?).to be true
    end

    it 'is not valid without an Authorization header' do
      strategy = build_strategy(nil)

      expect(strategy.valid?).to be false
    end
  end

  describe '#authenticate!' do
    let(:user) { create(:person) }
    let(:token) { Usecases::Authentication::BuildToken.by_user(user) }

    it 'succeeds with the user found in the token payload' do
      strategy = build_strategy("Bearer #{token}")

      strategy.authenticate!

      expect(strategy).to be_successful
      expect(strategy.user).to eq(user)
    end

    it 'accepts the raw token without a "Bearer " prefix' do
      strategy = build_strategy(token)

      strategy.authenticate!

      expect(strategy).to be_successful
      expect(strategy.user).to eq(user)
    end

    it 'does not succeed when no user matches the token payload' do
      token_for_unknown_user = Usecases::Authentication::BuildToken.by_user(build_stubbed(:person, id: -1))
      strategy = build_strategy("Bearer #{token_for_unknown_user}")

      strategy.authenticate!

      expect(strategy).not_to be_successful
      expect(strategy.result).to be_nil
    end

    it 'fails when the user is locked' do
      user.lock_access!
      strategy = build_strategy("Bearer #{token}")

      strategy.authenticate!

      expect(strategy).not_to be_successful
      expect(strategy.result).to eq(:failure)
    end

    it 'fails with :invalid_token when the token is expired' do
      expired_token = JsonWebToken.encode({ user_id: user.id }, 1.second.ago)
      strategy = build_strategy("Bearer #{expired_token}")

      strategy.authenticate!

      expect(strategy).not_to be_successful
      expect(strategy.result).to eq(:failure)
      expect(strategy.message).to eq(:invalid_token)
    end

    it 'fails with :invalid_token when the token cannot be decoded' do
      strategy = build_strategy('Bearer not-a-real-token')

      strategy.authenticate!

      expect(strategy).not_to be_successful
      expect(strategy.message).to eq(:invalid_token)
    end
  end
end
