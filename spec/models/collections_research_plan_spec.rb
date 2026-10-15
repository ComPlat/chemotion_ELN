# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_research_plans
#
#  id               :integer          not null, primary key
#  collection_id    :integer
#  research_plan_id :integer
#  deleted_at       :datetime
#
# Indexes
#
#  index_collections_research_plans_on_collection_id         (collection_id)
#  index_collections_research_plans_on_rplan_id_and_coll_id  (research_plan_id,collection_id) UNIQUE
#
require 'rails_helper'

RSpec.describe CollectionsResearchPlan do
  let(:source) { create(:collection) }
  let(:target) { create(:collection) }
  let(:plan_a) { create(:research_plan) }
  let(:plan_b) { create(:research_plan) }

  describe 'associations' do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to belong_to(:research_plan) }
  end

  describe '.remove_in_collection' do
    before do
      described_class.create!(collection: source, research_plan: plan_a)
      described_class.create!(collection: source, research_plan: plan_b)
      described_class.create!(collection: target, research_plan: plan_a)
      described_class.remove_in_collection([plan_a.id], [source.id])
    end

    it 'soft-deletes the research plan in the given collection' do
      expect(source.reload.research_plans).to contain_exactly(plan_b)
      expect(source.collections_research_plans.only_deleted.map(&:research_plan_id)).to contain_exactly(plan_a.id)
    end

    it 'keeps the research plan in other collections' do
      expect(target.reload.research_plans).to contain_exactly(plan_a)
    end
  end

  describe '.move_to_collection' do
    before do
      described_class.create!(collection: source, research_plan: plan_a)
      described_class.create!(collection: target, research_plan: plan_b, deleted_at: Time.current)
      described_class.move_to_collection([plan_a.id, plan_b.id], [source.id], [target.id])
    end

    it 'removes the research plans from the source collection' do
      expect(source.reload.research_plans).to be_empty
    end

    it 'adds them to the target, restoring previously removed links' do
      expect(target.reload.research_plans).to contain_exactly(plan_a, plan_b)
      expect(target.collections_research_plans.only_deleted).to be_empty
    end
  end

  describe '.create_in_collection' do
    it 'adds the research plans to the target collections' do
      described_class.create_in_collection([plan_a.id, plan_b.id], [source.id, target.id])

      expect(source.reload.research_plans).to contain_exactly(plan_a, plan_b)
      expect(target.reload.research_plans).to contain_exactly(plan_a, plan_b)
    end

    it 'ignores ids of research plans that do not exist' do
      described_class.create_in_collection([plan_a.id, 0], [source.id])

      expect(source.reload.research_plans).to contain_exactly(plan_a)
    end
  end
end
