# frozen_string_literal: true

# == Schema Information
#
# Table name: research_plans
#
#  id          :integer          not null, primary key
#  body        :jsonb
#  created_by  :integer          not null
#  deleted_at  :datetime
#  name        :string           not null
#  short_label :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
require 'rails_helper'

RSpec.describe ResearchPlan, type: :model do
  describe 'creation' do
    let(:research_plan) { create(:research_plan) }

    it 'is possible to create a valid research plan' do
      expect(research_plan.valid?).to be(true)
    end

    it 'is invalid if name is blank' do
      research_plan.name = nil
      expect(research_plan.valid?).to be(false)
    end

    it 'is invalid if creator is blank' do
      research_plan.creator = nil
      expect(research_plan.valid?).to be(false)
    end
  end
end
