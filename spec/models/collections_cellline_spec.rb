# frozen_string_literal: true

# rubocop:disable RSpec/IndexedLet, Lint/RedundantCopDisableDirective

# == Schema Information
#
# Table name: collections_celllines
#
#  id                 :bigint           not null, primary key
#  deleted_at         :datetime
#  cellline_sample_id :integer
#  collection_id      :integer
#
# Indexes
#
#  index_collections_celllines_on_cellsample_id_and_coll_id  (cellline_sample_id,collection_id) UNIQUE
#  index_collections_celllines_on_collection_id              (collection_id)
#  index_collections_celllines_on_deleted_at                 (deleted_at)
#
require 'rails_helper'

RSpec.describe CollectionsCellline do
  subject(:execute) do
    described_class.move_to_collection(
      sample.id,
      collection_src_id,
      collection_target_id,
    )
  end

  let(:c1) { create(:collection) }
  let(:c2) { create(:collection) }
  let(:collection_src_id) { c1.id }
  let(:collection_target_id) { c2.id }
  let(:sample) { create(:cellline_sample, collections: [c1]) }

  before { execute }

  context 'when target collection is valid and has not yet the cell line' do
    it 'cell line is now connected to new collection' do
      expect(described_class.find_by(
               collection_id: collection_target_id,
               cellline_sample_id: sample.id,
             )).not_to be_nil
    end

    it 'cell line is deleted in old collection' do
      expect(described_class.find_by(
               collection_id: collection_src_id,
               cellline_sample_id: sample.id,
             )).to be_nil
    end
  end

  context 'when target collection is not available' do
    let(:collection_target_id) { 1_234_567_890 }

    it 'skips creating the record' do
      expect(described_class.find_by(collection_id: collection_target_id)).to be_nil
    end
  end

  context 'when target collection is valid and but cell line is already in it' do
    let(:c2) { create(:collection) }
    let(:sample) { create(:cellline_sample, collections: [c1, c2]) }

    it 'cell line exists once in the target collection' do
      expect(described_class.where(
        collection_id: collection_target_id,
        cellline_sample_id: sample.id,
      ).count).to be 1
    end

    it 'cell line was removed from the old collection' do
      expect(described_class.find_by(
               collection_id: collection_src_id,
               cellline_sample_id: sample.id,
             )).to be_nil
    end
  end
end
# rubocop:enable RSpec/IndexedLet, Lint/RedundantCopDisableDirective
