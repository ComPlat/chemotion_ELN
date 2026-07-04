# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmProviderResolver do
  let(:user) { create(:user) }

  describe '.resolve' do
    context 'when a global provider is configured' do
      let!(:global) { create(:llm_provider, enabled: true, default_model: 'kit.qwen3.5') }

      it 'returns a resolution with the global provider' do
        resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
        expect(resolution.provider).to eq(global)
        expect(resolution.model).to eq('kit.qwen3.5')
        expect(resolution.base_url).to eq(global.base_url)
      end

      it 'includes the decrypted api_key' do
        resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
        expect(resolution.api_key).to eq(global.api_key)
      end
    end

    context 'when no provider is configured' do
      it 'raises LlmNotConfiguredError' do
        expect { described_class.resolve(user: user, task_name: 'sds_extraction') }
          .to raise_error(Errors::LlmNotConfiguredError)
      end
    end

    context 'when the global provider is disabled' do
      let!(:disabled_global) { create(:llm_provider, :disabled) }

      it 'raises LlmNotConfiguredError' do
        expect { described_class.resolve(user: user, task_name: 'any_task') }
          .to raise_error(Errors::LlmNotConfiguredError)
      end
    end

    context 'when multiple global providers exist' do
      let!(:first_global)  { create(:llm_provider, enabled: true) }
      let!(:second_global) { create(:llm_provider, enabled: true) }

      it 'uses the first (lowest id) global provider' do
        resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
        expect(resolution.provider).to eq(first_global)
      end
    end

    # ── SF-03: the per-user "AI Feature Access" gate was removed (2026-07) ───────
    # resolve() no longer blocks on the aiFeatures Matrice; AI is available to any
    # user with a configured provider. (The aiUserApiKey gate is exercised below.)

    context 'when the aiFeatures Matrice is disabled with no include list' do
      let!(:global) { create(:llm_provider, enabled: true) }

      before { Matrice.find_or_create_by(name: 'aiFeatures').update!(enabled: false, include_ids: [], exclude_ids: []) }
      after  { Matrice.find_by(name: 'aiFeatures')&.destroy }

      it 'still resolves (aiFeatures no longer gates resolution)' do
        expect { described_class.resolve(user: user, task_name: 'sds_extraction') }
          .not_to raise_error
      end
    end
  end

  describe '.client_for' do
    let!(:global) { create(:llm_provider, enabled: true) }

    it 'returns an LlmClient instance' do
      client = described_class.client_for(user: user, task_name: 'sds_extraction')
      expect(client).to be_a(LlmClient)
    end
  end

  # ── SF-03 access gate helpers ────────────────────────────────────────────────

  describe '.ai_features_enabled? / .user_api_key_allowed? / .institution_provider_allowed?' do
    it 'is permissive when the Matrice gate is absent' do
      expect(described_class.ai_features_enabled?(user)).to be true
      expect(described_class.user_api_key_allowed?(user)).to be true
      expect(described_class.institution_provider_allowed?(user)).to be true
    end

    context 'when aiUserApiKey is disabled with an include list' do
      let(:other) { create(:user) }

      before { Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [user.id]) }
      after  { Matrice.find_by(name: 'aiUserApiKey')&.destroy }

      it 'permits only users on the include list' do
        expect(described_class.user_api_key_allowed?(user)).to be true
        expect(described_class.user_api_key_allowed?(other)).to be false
      end
    end
  end

  describe 'institution-provider gate on .resolve' do
    let!(:global) { create(:llm_provider, enabled: true) }
    let(:other) { create(:user) }

    before do
      Matrice.find_or_create_by(name: 'aiGlobalProvider')
             .update!(enabled: false, include_ids: [user.id], exclude_ids: [])
    end
    after { Matrice.find_by(name: 'aiGlobalProvider')&.destroy }

    it 'resolves the global provider only for users granted institution access' do
      expect { described_class.resolve(user: user, task_name: 'sds_extraction') }.not_to raise_error
      expect { described_class.resolve(user: other, task_name: 'sds_extraction') }
        .to raise_error(Errors::LlmNotConfiguredError)
    end
  end
end
