# frozen_string_literal: true

# == Schema Information
#
# Table name: user_llm_settings
#
#  id            :bigint           not null, primary key
#  api_key_enc   :text
#  api_protocol  :string           default("openai"), not null
#  base_url      :string
#  default_model :string
#  enabled       :boolean          default(TRUE), not null
#  provider_type :string           default("global"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  user_id       :bigint           not null
#
# Indexes
#
#  index_user_llm_settings_on_user_id  (user_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

RSpec.describe UserLlmSetting, type: :model do
  subject(:setting) { build(:user_llm_setting) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it 'is valid with valid custom attributes' do
      expect(setting).to be_valid
    end

    it 'rejects unknown provider_type values' do
      setting.provider_type = 'unknown_provider'
      expect(setting).not_to be_valid
      expect(setting.errors[:provider_type]).to be_present
    end

    it 'requires base_url when provider_type is custom' do
      setting.base_url = nil
      expect(setting).not_to be_valid
      expect(setting.errors[:base_url]).to be_present
    end

    it 'does not require base_url when provider_type is global' do
      setting.provider_type = 'global'
      setting.base_url      = nil
      expect(setting).to be_valid
    end
  end

  describe 'API key encryption' do
    let(:user) { create(:person) }

    it 'encrypts the api_key before saving' do
      s = create(:user_llm_setting, user: user, api_key: 'sk-secret-1234')
      s.reload
      expect(s.api_key_enc).not_to eq('sk-secret-1234')
      expect(s.api_key_enc).to be_present
    end

    it 'decrypts the key on read' do
      s = create(:user_llm_setting, user: user, api_key: 'sk-secret-1234')
      s.reload
      expect(s.api_key).to eq('sk-secret-1234')
    end

    it 'returns a masked key for display' do
      s = create(:user_llm_setting, user: user, api_key: 'sk-my-secret-5678')
      s.reload
      expect(s.api_key_masked).to match(/\Ask-•+\d{4}\z/)
    end

    it 'returns nil api_key_masked when no key is stored' do
      s = create(:user_llm_setting, :global, user: user)
      expect(s.api_key_masked).to be_nil
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

RSpec.describe UserTaskModelMapping, type: :model do
  subject(:mapping) { build(:user_task_model_mapping) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(mapping).to be_valid
    end

    it 'requires task_name' do
      mapping.task_name = nil
      expect(mapping).not_to be_valid
    end

    it 'requires model' do
      mapping.model = nil
      expect(mapping).not_to be_valid
    end

    it 'enforces uniqueness of task_name per user' do
      user = create(:person)
      create(:user_task_model_mapping, user: user, task_name: 'sds_extraction')
      duplicate = build(:user_task_model_mapping, user: user, task_name: 'sds_extraction')
      expect(duplicate).not_to be_valid
    end

    it 'allows the same task_name for different users' do
      create(:user_task_model_mapping, task_name: 'sds_extraction')
      other_user = create(:person)
      mapping2 = build(:user_task_model_mapping, user: other_user, task_name: 'sds_extraction')
      expect(mapping2).to be_valid
    end
  end
end
