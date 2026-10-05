# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_samples
#
#  id            :integer          not null, primary key
#  deleted_at    :datetime
#  collection_id :integer
#  sample_id     :integer
#
# Indexes
#
#  index_collections_samples_on_collection_id                (collection_id)
#  index_collections_samples_on_deleted_at                   (deleted_at)
#  index_collections_samples_on_sample_id_and_collection_id  (sample_id,collection_id) UNIQUE
#
require 'rails_helper'

RSpec.describe CollectionsSample, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:s1) { create(:sample) }
  let(:s2) { create(:sample) }
  let(:s3) { create(:sample) }
  let(:s4) { create(:sample) }
  let(:s5) { create(:sample) }
  let(:s6) { create(:sample) }
  let(:wp) { create(:wellplate, samples: [s5]) }
  let(:r) { create(:reaction, samples: [s6]) }

  describe 'before delete_in_collection ' do
    before do
      described_class.create!(collection_id: c1.id, sample_id: s1.id)
      described_class.create!(collection_id: c1.id, sample_id: s2.id)
      described_class.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c2.id, sample_id: s1.id)
      described_class.create!(collection_id: c2.id, sample_id: s4.id)
    end

    it 'does not nothing' do
      c1.reload
      expect(c1.samples).to match_array [s1, s2]
      expect(c1.collections_samples.only_deleted).not_to be_empty
      expect(c2.samples).to match_array [s1, s4]
    end
  end

  describe 'delete_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, sample_id: s1.id)
      described_class.create!(collection_id: c1.id, sample_id: s2.id)
      described_class.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c2.id, sample_id: s1.id)
      described_class.create!(collection_id: c2.id, sample_id: s4.id)
    end

    it 'soft-deletes with arr args' do
      described_class.delete_in_collection([s1.id, s3.id, s4.id], [c1.id])
      c1.reload
      expect(c1.samples).to match_array [s2]
      expect(c2.samples).to match_array [s1, s4]
    end
    it 'soft-deletes with int args' do
      described_class.delete_in_collection(s1, c1.id)
      c1.reload
      expect(c1.samples).to match_array [s2]
      expect(c2.samples).to match_array [s1, s4]
    end
  end

  describe 'delete_in_collection_with_filter, ' do
    before do
      described_class.create!(collection_id: c1.id, sample_id: s1.id)
      described_class.create!(collection_id: c2.id, sample_id: s1.id)
      described_class.create!(collection_id: c1.id, sample_id: s5.id)
      described_class.create!(collection_id: c1.id, sample_id: s6.id)
      CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: wp.id)
      CollectionsReaction.create!(collection_id: c1.id, reaction_id: r.id)
    end

    it 'soft-deletes only samples not associated to reaction or wellplate' do
      described_class.delete_in_collection_with_filter([s1.id, s5.id, s6.id], [c1.id])
      expect(c1.samples).to match_array [s5, s6]
      expect(c2.samples).to match_array [s1]
    end

    it 'returns the kept ids, covering both the wellplate- and reaction-linked samples' do
      # s5 is kept by its wellplate, s6 by its reaction; s1 is free and removed
      locked = described_class.delete_in_collection_with_filter([s1.id, s5.id, s6.id], [c1.id])
      expect(locked).to contain_exactly(s5.id, s6.id)
    end
  end

  describe 'insert_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, sample_id: s2.id)
      described_class.create!(collection_id: c1.id, sample_id: s3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c1.id, sample_id: s4.id)
    end

    it 'creates with arr args' do
      described_class.insert_in_collection([s1.id, s3.id, s4.id], [c1.id])
      expect(c1.samples).to match_array [s1, s2, s3, s4]
    end
    it 'creates with int args' do
      described_class.insert_in_collection(s1.id, c2.id)
      expect(c2.samples).to match_array [s1]
    end
  end
end

RSpec.describe CollectionsSample do
  describe 'inventory sample flag' do
    let(:plain_collection) { create(:collection) }
    let(:inventory) { create(:inventory, prefix: 'INV') }
    let(:inventory_collection) { create(:collection, inventory: inventory) }
    let(:unlabelled_collection) { create(:collection, inventory: create(:inventory, prefix: nil, name: nil)) }
    let(:sample) { create(:sample, collections: [plain_collection], inventory_sample: false) }

    it 'flags a sample created in a labelled inventory collection' do
      new_sample = create(:sample, collections: [inventory_collection], inventory_sample: false)

      expect(new_sample.inventory_sample).to be true
      expect(new_sample.reload.inventory_sample).to be true
    end

    it 'flags a sample added to a labelled inventory collection' do
      sample.collections << inventory_collection

      expect(sample.reload.inventory_sample).to be true
    end

    it 'flags samples copied into a labelled inventory collection' do
      described_class.create_in_collection([sample.id], [inventory_collection.id])

      expect(sample.reload.inventory_sample).to be true
    end

    it 'flags samples moved into a labelled inventory collection' do
      described_class.move_to_collection([sample.id], [plain_collection.id], [inventory_collection.id])

      expect(sample.reload.inventory_sample).to be true
    end

    it 'does not flag samples placed in a collection without a labelled inventory' do
      described_class.create_in_collection([sample.id], [unlabelled_collection.id])
      sample.collections << create(:collection)

      expect(sample.reload.inventory_sample).to be false
    end
  end
end
