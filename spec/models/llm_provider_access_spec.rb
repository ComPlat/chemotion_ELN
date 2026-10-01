# frozen_string_literal: true

require 'rails_helper'

# The access rules as LlmProvider applies them: who may reach the provider, and
# which of its models they are offered.
RSpec.describe LlmProvider, type: :model do
  let(:user)  { create(:person) }
  let(:other) { create(:person) }
  let(:models) { %w[kit.qwen kit.llama3 kit.deepseek] }

  describe '#grants_access_to?' do
    it 'is open when the provider carries no rule' do
      expect(create(:llm_provider).grants_access_to?(user)).to be true
    end

    it 'follows the provider rule when there is one' do
      provider = create(:llm_provider)
      create(:llm_provider_grant, llm_provider: provider, enabled: false, include_ids: [user.id])

      expect(provider.reload.grants_access_to?(user)).to be true
      expect(provider.reload.grants_access_to?(other)).to be false
    end
  end

  describe '#models_for' do
    it 'offers every model when nothing is restricted' do
      expect(create(:llm_provider).models_for(user, models)).to eq(models)
    end

    it 'withholds a model whose rule excludes the user' do
      provider = create(:llm_provider)
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.deepseek', exclude_ids: [user.id])

      expect(provider.reload.models_for(user, models)).to eq(%w[kit.qwen kit.llama3])
      expect(provider.reload.models_for(other, models)).to eq(models)
    end

    it 'offers only the models a rule names when the provider is restricted' do
      provider = create(:llm_provider, :restricted)
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.llama3')

      expect(provider.reload.models_for(user, models)).to eq(['kit.llama3'])
    end

    it 'offers a restricted provider’s model only to the users its rule names' do
      provider = create(:llm_provider, :restricted)
      create(:llm_provider_grant, llm_provider: provider, model: 'kit.llama3',
                                  enabled: false, include_ids: [user.id])

      expect(provider.reload.models_for(user, models)).to eq(['kit.llama3'])
      expect(provider.reload.models_for(other, models)).to eq([])
    end
  end
end
