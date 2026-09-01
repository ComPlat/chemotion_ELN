# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmProviderGrant, type: :model do
  let(:provider) { create(:llm_provider) }
  let(:user)     { create(:person) }
  let(:other)    { create(:person) }

  describe 'validations' do
    it 'rejects a rule about a personal provider' do
      grant = build(:llm_provider_grant, llm_provider: create(:llm_provider, :personal, user: user))

      expect(grant).not_to be_valid
      expect(grant.errors[:llm_provider]).to be_present
    end

    it 'rejects a second rule about the same model' do
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.llama3')

      expect(build(:llm_provider_grant, llm_provider: provider, model: 'kit.llama3')).not_to be_valid
    end

    it 'rejects a second rule about the provider itself' do
      create(:llm_provider_grant, llm_provider: provider)

      expect(build(:llm_provider_grant, llm_provider: provider)).not_to be_valid
    end

    it 'accepts rules about different models of the same provider' do
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.llama3')

      expect(build(:llm_provider_grant, llm_provider: provider, model: 'kit.qwen')).to be_valid
    end
  end

  describe '#allows?' do
    it 'admits everyone but the excluded when enabled' do
      grant = build(:llm_provider_grant, enabled: true, exclude_ids: [other.id])

      expect(grant.allows?(user)).to be true
      expect(grant.allows?(other)).to be false
    end

    it 'admits only the included when disabled' do
      grant = build(:llm_provider_grant, enabled: false, include_ids: [user.id])

      expect(grant.allows?(user)).to be true
      expect(grant.allows?(other)).to be false
    end

    it 'admits a user through their group' do
      group = create(:group, users: [user])
      grant = build(:llm_provider_grant, enabled: false, include_ids: [group.id])

      expect(grant.allows?(user)).to be true
      expect(grant.allows?(other)).to be false
    end
  end
end
