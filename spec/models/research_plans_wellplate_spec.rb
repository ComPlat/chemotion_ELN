# frozen_string_literal: true

# == Schema Information
#
# Table name: research_plans_wellplates
#
#  research_plan_id :bigint           not null
#  wellplate_id     :bigint           not null
#  id               :bigint           not null, primary key
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#  log_data         :jsonb
#
# Indexes
#
#  index_research_plans_wellplates_on_research_plan_id  (research_plan_id)
#  index_research_plans_wellplates_on_wellplate_id      (wellplate_id)
#
require 'rails_helper'

RSpec.describe ResearchPlansWellplate do
  let(:plan_a) { create(:research_plan) }
  let(:plan_b) { create(:research_plan) }
  let(:shared_plate) { create(:wellplate) }
  let(:single_plate) { create(:wellplate) }
  let(:unlinked_plate) { create(:wellplate) }

  before do
    described_class.create!(research_plan: plan_a, wellplate: shared_plate)
    described_class.create!(research_plan: plan_a, wellplate: single_plate)
    described_class.create!(research_plan: plan_b, wellplate: shared_plate)
    described_class.create!(research_plan: plan_b, wellplate: unlinked_plate).destroy
  end

  describe 'associations' do
    it { is_expected.to belong_to(:research_plan) }
    it { is_expected.to belong_to(:wellplate) }
  end

  describe '.get_wellplates' do
    it 'returns the unique wellplate ids linked to the research plans' do
      expect(described_class.get_wellplates([plan_a.id, plan_b.id]))
        .to contain_exactly(shared_plate.id, single_plate.id)
    end

    it 'ignores soft-deleted links' do
      expect(described_class.get_wellplates(plan_b.id)).to eq [shared_plate.id]
    end
  end

  describe '.get_research_plans' do
    it 'returns the unique research plan ids linked to the wellplates' do
      expect(described_class.get_research_plans([shared_plate.id, single_plate.id]))
        .to contain_exactly(plan_a.id, plan_b.id)
    end

    it 'ignores soft-deleted links' do
      expect(described_class.get_research_plans(unlinked_plate.id)).to eq []
    end
  end
end
