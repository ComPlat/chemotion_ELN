# frozen_string_literal: true

# == Schema Information
#
# Table name: user_task_model_mappings
#
#  id              :bigint           not null, primary key
#  model           :string
#  task_name       :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  llm_provider_id :bigint
#  user_id         :bigint           not null
#
# Indexes
#
#  index_user_task_model_mappings_on_llm_provider_id        (llm_provider_id)
#  index_user_task_model_mappings_on_user_id                (user_id)
#  index_user_task_model_mappings_on_user_id_and_task_name  (user_id,task_name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (llm_provider_id => llm_providers.id) ON DELETE => cascade
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
require 'rails_helper'

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
