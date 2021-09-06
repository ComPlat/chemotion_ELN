# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsResearchPlan, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:c3) { create(:collection) }
  let(:rp1) { create(:research_plan) }
  let(:rp2) { create(:research_plan) }
  let(:rp3) { create(:research_plan) }
  let(:rp4) { create(:research_plan) }
  let(:rp5) { create(:research_plan) }

  describe 'delete_in_collection, ' do
    before do
      described_class.find_or_create_by!(research_plan: rp1, collection: c1)
      described_class.find_or_create_by!(research_plan: rp2, collection: c1)
      described_class.find_or_create_by!(research_plan: rp3, collection: c1, deleted_at: Time.now)
      described_class.find_or_create_by!(research_plan: rp1, collection: c2)
      described_class.find_or_create_by!(research_plan: rp4, collection: c2)
    end

    it 'soft-deletes with arr args' do
      described_class.delete_in_collection([rp1.id, rp3.id, rp4.id], [c1.id])
      c1.reload
      expect(c1.research_plans).to match_array [rp2]
      expect(c2.research_plans).to match_array [rp1, rp4]
    end

    it 'soft-deletes with int args' do
      described_class.delete_in_collection(rp1, c1.id)
      c1.reload
      expect(c1.research_plans).to match_array [rp2]
      expect(c2.research_plans).to match_array [rp1, rp4]
    end
  end

  describe 'insert_in_collection, ' do
    before do
      described_class.find_or_create_by!(collection: c1, research_plan: rp2)
      described_class.find_or_create_by!(collection: c1, research_plan: rp3, deleted_at: Time.now)
      described_class.find_or_create_by!(collection: c1, research_plan: rp4)
    end

    it 'creates with arr args' do
      described_class.insert_in_collection([rp1.id, rp3.id, rp4.id], [c1.id])
      c1.reload
      expect(c1.research_plans).to match_array [rp1, rp2, rp3, rp4]
    end

    it 'creates with int args' do
      described_class.insert_in_collection(rp1.id, c2.id)
      c2.reload
      expect(c2.research_plans).to match_array [rp1]
    end
  end

  describe 'create_in_collection, ' do
    it 'add rp to collection' do
      described_class.create_in_collection([rp5.id], [c2.id])
      expect(c2.research_plans.map(&:id)).to match_array [rp5.id]
    end
  end

  describe 'move_to_collection: ' do
    before do
      described_class.find_or_create_by!(collection_id: c1.id, research_plan_id: rp5.id)
      described_class.move_to_collection([rp5.id], [c1.id], [c2.id])
    end

    it 'source collection is empty' do
      expect(c1.research_plans.map(&:id)).to match_array []
      expect(c1.collections_research_plans.only_deleted.map(&:research_plan_id)).to match_array [rp5.id]
    end

    it 'target collection has new research plan' do
      expect(c2.research_plans.map(&:id)).to match_array [rp5.id]
    end
  end

  describe 'remove_in_collection, ' do
    before do
      described_class.find_or_create_by!(collection_id: c1.id, research_plan_id: rp5.id)
    end

    it 'remove rp from collection' do
      described_class.remove_in_collection([rp5.id], [c1.id])
      expect(c1.research_plans.map(&:id)).to match_array []
      expect(c1.collections_research_plans.only_deleted.map(&:research_plan_id)).to match_array [rp5.id]
    end
  end
end
