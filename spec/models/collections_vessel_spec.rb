# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsVessel do
  let(:collection1) { create(:collection) }
  let(:collection2) { create(:collection) }
  let(:vessel1) { create(:vessel) }
  let(:vessel2) { create(:vessel) }
  let(:vessel3) { create(:vessel) }
  let(:vessel4) { create(:vessel) }

  describe 'delete_in_collection,' do
    before do
      described_class.create!(collection_id: collection1.id, vessel_id: vessel1.id)
      described_class.create!(collection_id: collection1.id, vessel_id: vessel2.id)
      described_class.create!(collection_id: collection1.id, vessel_id: vessel3.id, deleted_at: Time.now)
      described_class.create!(collection_id: collection2.id, vessel_id: vessel1.id)
      described_class.create!(collection_id: collection2.id, vessel_id: vessel4.id)
    end

    it 'soft-deletes with arr args' do
      described_class.delete_in_collection([vessel1.id, vessel3.id, vessel4.id], [collection1.id])
      collection1.reload
      expect(collection1.vessels).contain_exactly [vessel2]
      expect(collection2.vessels).contain_exactly [vessel1, vessel4]
    end

    it 'soft-deletes with int args' do
      described_class.delete_in_collection(vessel1, collection1.id)
      collection1.reload
      expect(collection1.vessels).contain_exactly [vessel2]
      expect(collection2.vessels).contain_exactly [vessel1, vessel4]
    end
  end

  describe 'insert_in_collection,' do
    before do
      described_class.create!(collection_id: collection1.id, vessel_id: vessel2.id)
      described_class.create!(collection_id: collection1.id, vessel_id: vessel3.id, deleted_at: Time.now)
      described_class.create!(collection_id: collection1.id, vessel_id: vessel4.id)
    end

    it 'creates with arr args' do
      described_class.insert_in_collection([vessel1.id, vessel3.id, vessel4.id], [collection1.id])
      collection1.reload
      expect(collection1.vessels).contain_exactly [vessel1, vessel2, vessel3, vessel4]
    end

    it 'creates with int args' do
      described_class.insert_in_collection(vessel1.id, collection2.id)
      collection2.reload
      expect(collection2.vessels).contain_exactly [vessel1]
    end
  end
end
