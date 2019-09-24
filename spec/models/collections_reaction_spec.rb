# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsReaction, type: :model do
  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:c3) { create(:collection) }
  let(:r1) { create(:reaction) }
  let(:r2) { create(:reaction) }
  let(:r3) { create(:reaction) }
  let(:r4) { create(:reaction) }

  let(:s) { create(:sample) }
  let(:r5) { create(:reaction, samples: [s]) }

  describe 'delete_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, reaction_id: r1.id)
      described_class.create!(collection_id: c1.id, reaction_id: r2.id)
      described_class.create!(collection_id: c1.id, reaction_id: r3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c2.id, reaction_id: r1.id)
      described_class.create!(collection_id: c2.id, reaction_id: r4.id)
    end

    it 'soft-deletes with arr args' do
      described_class.delete_in_collection([r1.id, r3.id, r4.id], [c1.id])
      c1.reload
      expect(c1.reactions).to match_array [r2]
      expect(c2.reactions).to match_array [r1, r4]
    end
    it 'soft-deletes with int args' do
      described_class.delete_in_collection(r1, c1.id)
      c1.reload
      expect(c1.reactions).to match_array [r2]
      expect(c2.reactions).to match_array [r1, r4]
    end
  end

  describe 'insert_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, reaction_id: r2.id)
      described_class.create!(collection_id: c1.id, reaction_id: r3.id, deleted_at: Time.now)
      described_class.create!(collection_id: c1.id, reaction_id: r4.id)
    end

    it 'creates with arr args' do
      described_class.insert_in_collection([r1.id, r3.id, r4.id], [c1.id])
      c1.reload
      expect(c1.reactions).to match_array [r1, r2, r3, r4]
    end
    it 'creates with int args' do
      described_class.insert_in_collection(r1.id, c2.id)
      c2.reload
      expect(c2.reactions).to match_array [r1]
    end
  end

  describe 'remove_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, reaction_id: r5.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s.id)
    end

    it 'also soft-deletes associated samples' do
      described_class.remove_in_collection([r5.id], [c1.id])
      expect(c1.reactions.map(&:id)).to match_array []
      expect(c1.collections_reactions.only_deleted.map(&:reaction_id)).to match_array [r5.id]
      expect(c1.samples).to match_array []
      expect(c1.collections_samples.only_deleted.map(&:sample_id)).to match_array [s.id]
    end
  end

  describe 'create_in_collection, ' do
    it 'also creates for associated samples' do
      described_class.create_in_collection([r5.id], [c2.id])
      expect(c2.reactions.map(&:id)).to match_array [r5.id]
      expect(c2.samples).to match_array [s]
    end
  end

  describe 'move_in_collection, ' do
    before do
      described_class.create!(collection_id: c1.id, reaction_id: r5.id)
      CollectionsSample.create!(collection_id: c1.id, sample_id: s.id)
      described_class.move_to_collection([r5.id], [c1.id], [c2.id])
    end

    it 'also soft-deletes associated samples' do
      expect(c1.reactions.map(&:id)).to match_array []
      expect(c1.collections_reactions.only_deleted.map(&:reaction_id)).to match_array [r5.id]
      expect(c1.samples).to match_array []
      expect(c1.collections_samples.only_deleted.map(&:sample_id)).to match_array [s.id]
    end

    it 'also creates for associated samples' do
      expect(c2.reactions.map(&:id)).to match_array [r5.id]
      expect(c2.samples).to match_array [s]
    end
  end
end
