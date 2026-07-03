# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ApiToken, type: :model do
  let(:user) { create(:user) }

  describe 'token generation on create' do
    let(:api_token) { user.api_tokens.create!(name: 'CI') }

    it 'returns the one-time plaintext with the chemtoken_ prefix' do
      expect(api_token.plain_token).to match(/\Achemtoken_[0-9a-f]{64}\z/)
    end

    it 'persists only the SHA-256 digest of the plaintext' do
      expect(api_token.token_digest).to eq(Digest::SHA256.hexdigest(api_token.plain_token))
    end

    it 'never persists the plaintext (a fresh load has no plain_token)' do
      expect(described_class.find(api_token.id).plain_token).to be_nil
    end
  end

  describe '.authenticate' do
    let!(:api_token) { user.api_tokens.create!(name: 'CI') }
    let(:raw) { api_token.plain_token }

    it 'returns the token for a valid raw secret' do
      expect(described_class.authenticate(raw)).to eq(api_token)
    end

    it 'returns nil for an unknown token' do
      expect(described_class.authenticate('chemtoken_deadbeef')).to be_nil
    end

    it 'returns nil for a blank or nil token' do
      expect(described_class.authenticate('')).to be_nil
      expect(described_class.authenticate(nil)).to be_nil
    end

    it 'returns nil once the token is revoked' do
      api_token.revoke!
      expect(described_class.authenticate(raw)).to be_nil
    end

    it 'returns nil once the token is expired' do
      api_token.update!(expires_at: 1.minute.ago)
      expect(described_class.authenticate(raw)).to be_nil
    end

    it 'resolves the correct token when several exist' do
      other = user.api_tokens.create!(name: 'other')
      expect(described_class.authenticate(other.plain_token)).to eq(other)
      expect(described_class.authenticate(raw)).to eq(api_token)
    end
  end

  describe 'scopes' do
    let!(:active_token)  { user.api_tokens.create!(name: 'active', expires_at: 10.days.from_now) }
    let!(:revoked_token) { user.api_tokens.create!(name: 'revoked').tap(&:revoke!) }
    let!(:expired_token) { user.api_tokens.create!(name: 'expired', expires_at: 1.minute.ago) }
    let!(:never_expires) { user.api_tokens.create!(name: 'forever', expires_at: nil) }

    describe '.active' do
      it 'includes only non-revoked, non-expired tokens' do
        expect(described_class.active).to contain_exactly(active_token, never_expires)
        expect(described_class.active).not_to include(revoked_token, expired_token)
      end
    end

    describe '.not_expired' do
      it 'includes revoked-but-unexpired tokens (for the UI list) but excludes expired ones' do
        expect(described_class.not_expired).to contain_exactly(active_token, revoked_token, never_expires)
      end
    end
  end

  describe '#revoke!' do
    let(:api_token) { user.api_tokens.create!(name: 'CI') }

    it 'stamps revoked_at and drops the token from .active' do
      expect { api_token.revoke! }.to change(api_token, :revoked_at).from(nil)
      expect(described_class.active).not_to include(api_token)
    end
  end
end
