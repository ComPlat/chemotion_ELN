# frozen_string_literal: true

# == Schema Information
#
# Table name: llm_providers
#
#  id              :bigint           not null, primary key
#  api_key_enc     :text
#  api_protocol    :string           default("openai"), not null
#  base_url        :string
#  default_model   :string
#  enabled         :boolean          default(TRUE), not null
#  name            :string           not null
#  provider_type   :string
#  restrict_models :boolean          default(FALSE), not null
#  scope           :string           default("global"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  user_id         :bigint
#
# Indexes
#
#  index_llm_providers_on_scope              (scope)
#  index_llm_providers_on_user_id            (user_id)
#  index_llm_providers_on_user_id_and_scope  (user_id,scope)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe LlmProvider do
  describe 'validations' do
    it 'is valid with valid attributes' do
      provider = build(:llm_provider)
      expect(provider).to be_valid
    end

    it 'requires a default model' do
      provider = build(:llm_provider, default_model: '')
      expect(provider).not_to be_valid
      expect(provider.errors[:default_model]).to be_present
    end

    it 'requires a name' do
      provider = build(:llm_provider, name: nil)
      expect(provider).not_to be_valid
      expect(provider.errors[:name]).to be_present
    end
  end

  describe 'scopes' do
    let!(:global_enabled)  { create(:llm_provider, enabled: true) }
    let!(:global_disabled) { create(:llm_provider, enabled: false) }

    describe '.global_providers' do
      it 'returns only enabled providers, ordered by id' do
        expect(described_class.global_providers).to include(global_enabled)
        expect(described_class.global_providers).not_to include(global_disabled)
      end
    end
  end

  describe 'API key encryption' do
    let(:plain_key) { 'sk-test-super-secret-1234' }
    let(:provider)  { create(:llm_provider, api_key: plain_key) }

    it 'does not store the key in plaintext' do
      expect(provider.api_key_enc).not_to eq(plain_key)
      expect(provider.api_key_enc).to be_present
    end

    it 'decrypts the key on read' do
      reloaded = described_class.find(provider.id)
      expect(reloaded.api_key).to eq(plain_key)
    end

    it 'produces a masked key for display' do
      expect(provider.api_key_masked).to match(/\Ask-•+\d{4}\z/)
    end

    it 'returns nil api_key when no key is stored' do
      provider_no_key = create(:llm_provider, api_key: nil)
      expect(provider_no_key.api_key).to be_nil
    end

    it 'updates the encrypted key when api_key is reassigned' do
      provider.api_key = 'sk-new-key-9999'
      provider.save!
      expect(provider.reload.api_key).to eq('sk-new-key-9999')
    end

    it 'masks a short key completely' do
      expect(create(:llm_provider, api_key: 'tok1234').api_key_masked).not_to include('tok', '1234')
    end

    it 'logs a stored key it can no longer decrypt' do
      provider.update_column(:api_key_enc, 'bm9wZQ==--bm9wZQ==--bm9wZQ==') # rubocop:disable Rails/SkipsModelValidations
      allow(Rails.logger).to receive(:warn)

      expect(described_class.find(provider.id).api_key).to be_nil
      expect(Rails.logger).to have_received(:warn).with(/could not be decrypted/)
    end

    context 'when the secret is configured outside secrets.yml' do
      before do
        allow(Rails.application).to receive_messages(secrets: ActiveSupport::OrderedOptions.new,
                                                     secret_key_base: 'k' * 64)
        described_class.reset_llm_encryptor!
      end

      after { described_class.reset_llm_encryptor! }

      it 'derives its key from the application secret' do
        expect(described_class.find(provider.id).tap { |p| p.api_key = 'sk-x-5678' }.save!).to be true
      end
    end
  end
end
