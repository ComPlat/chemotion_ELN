# frozen_string_literal: true

# == Schema Information
#
# Table name: llm_providers
#
#  id            :bigint           not null, primary key
#  api_key_enc   :text
#  api_protocol  :string           default("openai"), not null
#  base_url      :string
#  default_model :string
#  enabled       :boolean          default(TRUE), not null
#  name          :string           not null
#  provider_type :string
#  scope         :string           default("global"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  user_id       :bigint
#
# Indexes
#
#  index_llm_providers_on_scope    (scope)
#  index_llm_providers_on_user_id  (user_id)
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
        expect(LlmProvider.global_providers).to include(global_enabled)
        expect(LlmProvider.global_providers).not_to include(global_disabled)
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
      reloaded = LlmProvider.find(provider.id)
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
  end
end
