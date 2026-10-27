# frozen_string_literal: true

# == Schema Information
#
# Table name: research_plan_table_schemas
#
#  id         :integer          not null, primary key
#  created_by :integer          not null
#  deleted_at :datetime
#  name       :string
#  value      :jsonb
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
require 'rails_helper'

RSpec.describe ResearchPlanTableSchema, type: :model do
  let(:user) { create(:person) }

  describe 'associations' do
    it { is_expected.to belong_to(:creator).class_name('User').with_foreign_key(:created_by) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:creator) }
  end

  describe 'soft delete' do
    it 'keeps the record in the table after destroy' do
      schema = described_class.create!(creator: user, name: 'schema', value: { 'columns' => [] })
      schema.destroy

      expect(described_class.find_by(id: schema.id)).to be_nil
      expect(described_class.with_deleted.find_by(id: schema.id)).to be_present
    end
  end
end
