# frozen_string_literal: true

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
