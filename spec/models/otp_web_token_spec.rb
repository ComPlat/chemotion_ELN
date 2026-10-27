# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OtpWebToken do
  let(:user) { build_stubbed(:person) }
  let(:root_url) { Rails.application.config.root_url }

  def jwt_from(link)
    Rack::Utils.parse_query(URI.parse(link).query)['jwt']
  end

  describe '.encode' do
    subject(:token) { described_class.encode(user) }

    it 'encodes the user id and the 2FA action' do
      payload = JsonWebToken.decode(token)

      expect(payload).to include('user_id' => user.id, 'action' => 'activate_2fa')
    end

    it 'expires after 30 minutes' do
      freeze_time do
        expect(JsonWebToken.decode(token)['exp']).to eq 30.minutes.from_now.to_i
      end
    end

    it 'is rejected once expired' do
      token
      travel(31.minutes) do
        expect { JsonWebToken.decode(token) }.to raise_error(Errors::ExpiredSignature)
      end
    end
  end

  describe '.enable_link' do
    subject(:link) { described_class.enable_link(user) }

    it 'points at the enable endpoint' do
      expect(link).to start_with("#{root_url}/users/two_factor_auth/request_enable?jwt=")
    end

    it 'carries a token for the user' do
      expect(JsonWebToken.decode(jwt_from(link))['user_id']).to eq user.id
    end
  end

  describe '.disable_link' do
    subject(:link) { described_class.disable_link(user) }

    it 'points at the disable endpoint' do
      expect(link).to start_with("#{root_url}/users/two_factor_auth/request_disable?jwt=")
    end

    it 'carries a token for the user' do
      expect(JsonWebToken.decode(jwt_from(link))['user_id']).to eq user.id
    end
  end
end
