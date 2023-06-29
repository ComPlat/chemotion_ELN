# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsVessel, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:c3) { create(:collection) }
  let(:v1) { create(:vessel) }
  let(:v2) { create(:vessel) }
  let(:v3) { create(:vessel) }
  let(:v4) { create(:vessel) }

  describe 'delete_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, vessel_id: v1.id)
      described_class.create!(collection_id: c1.id, vessel_id: v2.id)
      described_class.create!(collection_id: c1.id, vessel_id: v3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c2.id, vessel_id: v1.id)
      described_class.create!(collection_id: c2.id, vessel_id: v4.id)
    end

    it 'soft-deletes with arr args' do
      described_class.delete_in_collection([v1.id, v3.id, v4.id], [c1.id])
      c1.reload
      expect(c1.vessels).to match_array [v2]
      expect(c2.vessels).to match_array [v1, v4]
    end

    it 'soft-deletes with int args' do
      described_class.delete_in_collection(v1, c1.id)
      c1.reload
      expect(c1.vessels).to match_array [v2]
      expect(c2.vessels).to match_array [v1, v4]
    end
  end

  describe 'insert_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, vessel_id: v2.id)
      described_class.create!(collection_id: c1.id, vessel_id: v3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c1.id, vessel_id: v4.id)
    end

    it 'creates with arr args' do
      described_class.insert_in_collection([v1.id, v3.id, v4.id], [c1.id])
      c1.reload
      expect(c1.vessels).to match_array [v1, v2, v3, v4]
    end
    it 'creates with int args' do
      described_class.insert_in_collection(v1.id, c2.id)
      c2.reload
      expect(c2.vessels).to match_array [v1]
    end
  end
end