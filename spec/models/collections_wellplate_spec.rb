require 'rails_helper'

RSpec.describe CollectionsWellplate, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:c3) { create(:collection) }
  let(:w1) { create(:wellplate) }
  let(:w2) { create(:wellplate) }
  let(:w3) { create(:wellplate) }
  let(:w4) { create(:wellplate) }

  let(:s) { create(:sample) }
  let(:w5) { create(:wellplate, samples: [s]) }

  describe 'delete_in_collection, ' do
    before do
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w1.id)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w2.id)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w3.id, deleted_at: Time.now)
      CollectionsWellplate.create!(collection_id: c2.id, wellplate_id: w1.id)
      CollectionsWellplate.create!(collection_id: c2.id, wellplate_id: w4.id)
    end
    it 'soft-deletes with arr args' do
      CollectionsWellplate.delete_in_collection([w1.id, w3.id, w4.id], [c1.id])
      c1.reload
      expect(c1.wellplates).to match_array [w2]
      expect(c2.wellplates).to match_array [w1, w4]
    end
    it 'soft-deletes with int args' do
      CollectionsWellplate.delete_in_collection(w1, c1.id)
      c1.reload
      expect(c1.wellplates).to match_array [w2]
      expect(c2.wellplates).to match_array [w1, w4]
    end
  end

  describe 'insert_in_collection, ' do
    before do
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w2.id)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w3.id, deleted_at: Time.now)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w4.id)
    end
    it 'creates with arr args' do
      CollectionsWellplate.insert_in_collection([w1.id, w3.id, w4.id], [c1.id])
      c1.reload
      expect(c1.wellplates).to match_array [w1, w2, w3, w4]
    end
    it 'creates with int args' do
      CollectionsWellplate.insert_in_collection(w1.id, c2.id)
      c2.reload
      expect(c2.wellplates).to match_array [w1]
    end
  end

  describe 'remove_in_collection, ' do
    before do
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w5.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s.id)
    end
    it 'also soft-deletes associated samples' do
      CollectionsWellplate.remove_in_collection([w5.id], [c1.id])
      expect(c1.wellplates.map(&:id)).to match_array []
      expect(c1.collections_wellplates.only_deleted.map(&:wellplate_id)).to match_array [w5.id]
      expect(c1.samples).to match_array []
      expect(c1.collections_samples.only_deleted.map(&:sample_id)).to match_array [s.id]
    end
  end

  describe 'create_in_collection, ' do
    it 'also creates for associated samples' do
      CollectionsWellplate.create_in_collection([w5.id], [c2.id])
      expect(c2.wellplates.map(&:id)).to match_array [w5.id]
      expect(c2.samples).to match_array [s]
    end
  end

  describe 'move_in_collection, ' do
    before do
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w5.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s.id)
      CollectionsWellplate.move_to_collection([w5.id], [c1.id], [c2.id])
    end
    it 'also soft-deletes associated samples' do
      expect(c1.wellplates.map(&:id)).to match_array []
      expect(c1.collections_wellplates.only_deleted.map(&:wellplate_id)).to match_array [w5.id]
      expect(c1.samples).to match_array []
      expect(c1.collections_samples.only_deleted.map(&:sample_id)).to match_array [s.id]
    end

    it 'also creates for associated samples' do
      expect(c2.wellplates.map(&:id)).to match_array [w5.id]
      expect(c2.samples).to match_array [s]
    end
  end
end
