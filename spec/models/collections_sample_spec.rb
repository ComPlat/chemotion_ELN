require 'rails_helper'

RSpec.describe CollectionsSample, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:c3) { create(:collection) }
  let(:s1) { create(:sample) }
  let(:s2) { create(:sample) }
  let(:s3) { create(:sample) }
  let(:s4) { create(:sample) }
  let(:s5) { create(:sample) }
  let(:s6) { create(:sample) }

  let(:wp) { create(:wellplate, samples:[s5])}
  let(:r) { create(:reaction, samples: [s6])}

  describe 'before delete_in_collection ' do
    before do
      CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s2.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      CollectionsSample.create!(collection_id: c2.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c2.id, sample_id: s4.id)
    end
    it 'does not nothing' do
      c1.reload
      expect(c1.samples).to match_array [s1, s2]
      expect(c1.collections_samples.only_deleted).to_not be_empty
      expect(c2.samples).to match_array [s1, s4]
    end
  end

  describe 'delete_in_collection, ' do
    before do
      CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s2.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      CollectionsSample.create!(collection_id: c2.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c2.id, sample_id: s4.id)
    end
    it 'soft-deletes with arr args' do
      CollectionsSample.delete_in_collection([s1.id, s3.id, s4.id], [c1.id])
      c1.reload
      expect(c1.samples).to match_array [s2]
      expect(c2.samples).to match_array [s1, s4]
    end
    it 'soft-deletes with int args' do
      CollectionsSample.delete_in_collection(s1, c1.id)
      c1.reload
      expect(c1.samples).to match_array [s2]
      expect(c2.samples).to match_array [s1, s4]
    end
  end

  describe 'delete_in_collection_with_filter, ' do
    before do
      CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c2.id, sample_id: s1.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s5.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s6.id)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: wp.id)
      CollectionsReaction.create!(collection_id: c1.id, reaction_id: r.id)
    end
    it 'soft-deletes only samples not associated to reaction or wellplate' do
      CollectionsSample.delete_in_collection_with_filter([s1.id, s5.id, s6.id], [c1.id])
      expect(c1.samples).to match_array [s5, s6]
      expect(c2.samples).to match_array [s1]
    end
  end

  describe 'insert_in_collection, ' do
    before do
      CollectionsSample.create!(collection_id: c1.id, sample_id: s2.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s4.id)
    end
    it 'creates with arr args' do
      CollectionsSample.insert_in_collection([s1.id, s3.id, s4.id], [c1.id])
      expect(c1.samples).to match_array [s1, s2, s3, s4]
    end
    it 'creates with int args' do
      CollectionsSample.insert_in_collection(s1.id, c2.id)
      expect(c2.samples).to match_array [s1]
    end
  end
end
