# frozen_string_literal: true

# rubocop:disable RSpec/MultipleExpectations -- these assert one resolution as a whole

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
      before { create(:llm_provider, :disabled) }

      it 'raises LlmNotConfiguredError' do
        expect { described_class.resolve(user: user, task_name: 'any_task') }
          .to raise_error(Errors::LlmNotConfiguredError)
      end
    end

    context 'when multiple global providers exist' do
      let!(:first_global) { create(:llm_provider, enabled: true) }

      # A second candidate, so "uses the first" is actually a choice.
      before { create(:llm_provider, enabled: true) }

      it 'uses the first (lowest id) global provider' do
        resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
        expect(resolution.provider).to eq(first_global)
      end
    end

    # ── SF-03: the per-user "AI Feature Access" gate was removed (2026-07) ───────
    # resolve() no longer blocks on the aiFeatures Matrice; AI is available to any
    # user with a configured provider. (The aiUserApiKey gate is exercised below.)

    context 'when the aiFeatures Matrice is disabled with no include list' do
      before do
        create(:llm_provider, enabled: true)
        Matrice.find_or_create_by(name: 'aiFeatures')
               .update!(enabled: false, include_ids: [], exclude_ids: [])
      end

      after { Matrice.find_by(name: 'aiFeatures')&.destroy }

      it 'still resolves (aiFeatures no longer gates resolution)' do
        expect { described_class.resolve(user: user, task_name: 'sds_extraction') }
          .not_to raise_error
      end
    end
  end

  describe '.resolve with the user’s own providers' do
    let!(:institution) { create(:llm_provider, default_model: 'inst-model') }
    let!(:mine) do
      create(:llm_provider, :personal, user: user, name: 'My Claude',
                                       api_protocol: 'anthropic', base_url: 'https://api.anthropic.com',
                                       api_key: 'sk-ant-mine', default_model: 'claude-opus-4-8')
    end

    it 'uses the personal provider the preference points at' do
      UserLlmSetting.create!(user: user, provider_type: 'custom', default_llm_provider: mine)

      resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
      expect(resolution.provider).to eq(mine)
      expect(resolution.model).to eq('claude-opus-4-8')
      expect(resolution.protocol).to eq('anthropic')
      expect(resolution.api_key).to eq('sk-ant-mine')
    end

    it 'routes one task to a different provider than the default' do
      UserLlmSetting.create!(user: user, provider_type: 'global')
      UserTaskModelMapping.create!(user: user, task_name: 'sds_extraction', llm_provider: mine)

      expect(described_class.resolve(user: user, task_name: 'sds_extraction').provider).to eq(mine)
      expect(described_class.resolve(user: user, task_name: 'other_task').provider).to eq(institution)
    end

    it 'takes the model from the mapped provider when the mapping names none' do
      UserTaskModelMapping.create!(user: user, task_name: 'sds_extraction', llm_provider: mine)

      expect(described_class.resolve(user: user, task_name: 'sds_extraction').model).to eq('claude-opus-4-8')
    end

    it 'prefers the model the mapping names over the provider’s default' do
      UserTaskModelMapping.create!(user: user, task_name: 'sds_extraction',
                                   llm_provider: mine, model: 'claude-haiku-4-5')

      expect(described_class.resolve(user: user, task_name: 'sds_extraction').model).to eq('claude-haiku-4-5')
    end

    it 'falls back to the institution provider when the personal-key gate is revoked' do
      UserLlmSetting.create!(user: user, provider_type: 'custom', default_llm_provider: mine)
      UserTaskModelMapping.create!(user: user, task_name: 'sds_extraction', llm_provider: mine)
      Matrice.find_or_create_by(name: 'aiUserApiKey').update!(enabled: false, include_ids: [], exclude_ids: [])

      resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
      expect(resolution.provider).to eq(institution)
    end

    it 'never resolves another user’s provider' do
      theirs = create(:llm_provider, :personal, user: create(:person), api_key: 'sk-not-yours')
      # Bypasses the model-level validation on purpose: the resolver is the last
      # line of defence and must hold even for a row that got in some other way.
      mapping = UserTaskModelMapping.new(user: user, task_name: 'sds_extraction', llm_provider: theirs)
      mapping.save!(validate: false)

      resolution = described_class.resolve(user: user, task_name: 'sds_extraction')
      expect(resolution.provider).to eq(institution)
      expect(resolution.api_key).not_to eq('sk-not-yours')
    end

    it 'falls back to another of the user’s providers when the default was deleted' do
      setting = UserLlmSetting.create!(user: user, provider_type: 'custom', default_llm_provider: mine)
      mine.destroy
      setting.reload

      expect(setting.default_llm_provider_id).to be_nil
      spare = create(:llm_provider, :personal, user: user, default_model: 'spare-model')
      expect(described_class.resolve(user: user, task_name: 'sds_extraction').provider).to eq(spare)
    end
  end

  describe '.client_for' do
    before { create(:llm_provider, enabled: true) }

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
    let(:other) { create(:user) }

    before do
      create(:llm_provider, enabled: true)
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
# rubocop:enable RSpec/MultipleExpectations
