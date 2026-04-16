# frozen_string_literal: true

# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  data       :jsonb
#  deleted_at :datetime
#  name       :string
#  type       :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer          not null
#
# Indexes
#
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#
require 'rails_helper'

RSpec.describe TextTemplate, type: :model do
  describe PersonalTextTemplate do
    subject(:template) { build(:personal_text_template) }

    describe 'validations' do
      it { is_expected.to validate_presence_of(:name) }

      it 'is invalid with a duplicate name for the same user' do
        template.save!
        duplicate = build(:personal_text_template, user: template.user, name: template.name)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:name]).to be_present
      end

      it 'allows the same name for different users' do
        template.save!
        other_user_template = build(:personal_text_template, name: template.name, user: create(:user))
        expect(other_user_template).to be_valid
      end
    end
  end

  describe PredefinedTextTemplate do
    subject(:template) { build(:predefined_text_template) }

    describe 'validations' do
      it { is_expected.to validate_presence_of(:name) }

      it 'is invalid with a duplicate name regardless of user' do
        template.save!
        duplicate = build(:predefined_text_template, name: template.name)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:name]).to be_present
      end
    end
  end
end
