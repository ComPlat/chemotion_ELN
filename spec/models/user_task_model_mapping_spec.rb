# frozen_string_literal: true

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
