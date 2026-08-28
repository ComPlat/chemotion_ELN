# frozen_string_literal: true

# == Schema Information
#
# Table name: user_llm_settings
#
#  id                          :bigint           not null, primary key
#  enabled                     :boolean          default(TRUE), not null
#  provider_type               :string           default("global"), not null
#  created_at                  :datetime         not null
#  updated_at                  :datetime         not null
#  default_llm_provider_id     :bigint
#  institution_llm_provider_id :bigint
#  user_id                     :bigint           not null
#
# Indexes
#
#  index_user_llm_settings_on_default_llm_provider_id      (default_llm_provider_id)
#  index_user_llm_settings_on_institution_llm_provider_id  (institution_llm_provider_id)
#  index_user_llm_settings_on_user_id                      (user_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (default_llm_provider_id => llm_providers.id) ON DELETE => nullify
#  fk_rails_...  (institution_llm_provider_id => llm_providers.id) ON DELETE => nullify
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe UserLlmSetting, type: :model do
  subject(:setting) { build(:user_llm_setting) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    # Endpoint, model and key live on LlmProvider — this record only points at one,
    # so a valid custom preference is a provider pointer and nothing else.
    it 'is valid with valid custom attributes' do
      expect(setting).to be_valid
    end

    it 'is valid in global mode' do
      expect(build(:user_llm_setting, :global)).to be_valid
    end

    # The provider fields (and their presence rules) live on LlmProvider now —
    # this record only points at one. See LlmProvider for those validations.
    it 'rejects a default provider belonging to another user' do
      setting.default_llm_provider = create(:llm_provider, :personal, user: create(:user))
      expect(setting).not_to be_valid
      expect(setting.errors[:default_llm_provider]).to be_present
    end

    it 'accepts one of the user’s own providers as the default' do
      setting.save!
      setting.default_llm_provider = create(:llm_provider, :personal, user: setting.user)
      expect(setting).to be_valid
    end

    it 'rejects unknown provider_type values' do
      setting.provider_type = 'unknown_provider'
      expect(setting).not_to be_valid
      expect(setting.errors[:provider_type]).to be_present
    end

    it 'accepts an institution provider as the institution choice' do
      setting.institution_llm_provider = create(:llm_provider)
      expect(setting).to be_valid
    end

    it 'rejects a personal provider as the institution choice' do
      setting.institution_llm_provider = create(:llm_provider, :personal, user: create(:user))
      expect(setting).not_to be_valid
      expect(setting.errors[:institution_llm_provider]).to be_present
    end
  end

  describe '#use_global?' do
    it 'returns true for global provider_type' do
      expect(build(:user_llm_setting, :global).use_global?).to be true
    end

    it 'returns false for custom' do
      expect(setting.use_global?).to be false
    end
  end
end
