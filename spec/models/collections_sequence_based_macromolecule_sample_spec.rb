# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_sequence_based_macromolecule_samples
#
#  id                                     :bigint           not null, primary key
#  deleted_at                             :datetime
#  collection_id                          :bigint
#  sequence_based_macromolecule_sample_id :bigint
#
# Indexes
#
#  idx_collections_sbmm_sample_collection    (collection_id)
#  idx_collections_sbmm_sample_deleted_at    (deleted_at)
#  idx_collections_sbmm_sample_sample        (sequence_based_macromolecule_sample_id)
#  idx_collections_sbmm_sample_unique_joins  (collection_id,sequence_based_macromolecule_sample_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id)
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#
require 'rails_helper'

RSpec.describe CollectionsSequenceBasedMacromoleculeSample do
  let(:user) { create(:person) }
  let(:sbmm) { create(:uniprot_sbmm) }
  let(:source_collection) { create(:collection, user: user) }
  let(:target_collection) { create(:collection, user: user) }
  let(:sample_a) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }
  let(:sample_b) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }
  let(:sample_c) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }

  it { is_expected.to belong_to(:collection) }
  it { is_expected.to belong_to(:sequence_based_macromolecule_sample) }

  describe '.element_foreign_key' do
    it 'resolves to the sbmm sample foreign key' do
      expect(described_class.element_foreign_key).to eq('sequence_based_macromolecule_sample_id')
    end
  end

  describe '.element_klass' do
    it 'resolves to SequenceBasedMacromoleculeSample' do
      expect(described_class.element_klass).to eq(SequenceBasedMacromoleculeSample)
    end
  end

  describe '.delete_in_collection_with_filter' do
    before do
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_a)
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_b)
      described_class.create!(collection: target_collection, sequence_based_macromolecule_sample: sample_a)
    end

    it 'soft-deletes the samples only in the given collections' do
      described_class.delete_in_collection_with_filter([sample_a.id], [source_collection.id])

      expect(source_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_b)
      expect(target_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_a)
    end

    it 'accepts a single collection id' do
      described_class.delete_in_collection_with_filter([sample_a.id, sample_b.id], source_collection.id)

      expect(source_collection.reload.sequence_based_macromolecule_samples).to be_empty
    end

    it 'skips collection ids that are not integers' do
      described_class.delete_in_collection_with_filter([sample_a.id], [source_collection.id.to_s])

      expect(source_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_a, sample_b)
    end
  end

  describe '.remove_in_collection' do
    before do
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_a)
      allow(described_class).to receive(:update_tag_by_element_ids)
    end

    it 'soft-deletes the join rows' do
      described_class.remove_in_collection([sample_a.id], [source_collection.id])

      expect(described_class.only_deleted.where(sequence_based_macromolecule_sample: sample_a).count).to eq(1)
    end

    it 'refreshes the collection tag of the removed samples' do
      described_class.remove_in_collection([sample_a.id], [source_collection.id])

      expect(described_class).to have_received(:update_tag_by_element_ids).with([sample_a.id])
    end
  end

  describe '.create_in_collection' do
    before do
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_b,
                              deleted_at: Time.current)
      allow(described_class).to receive(:update_tag_by_element_ids)
    end

    it 'inserts new join rows and restores soft-deleted ones' do
      described_class.create_in_collection([sample_a.id, sample_b.id], [source_collection.id])

      expect(source_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_a, sample_b)
    end

    it 'ignores ids of non-existing samples' do
      described_class.create_in_collection([sample_a.id, 0], [source_collection.id])

      linked_ids = described_class.where(collection: source_collection).pluck(:sequence_based_macromolecule_sample_id)

      expect(linked_ids).to eq([sample_a.id])
    end

    it 'refreshes the collection tag of the added samples' do
      described_class.create_in_collection([sample_a.id], [source_collection.id])

      expect(described_class).to have_received(:update_tag_by_element_ids).with([sample_a.id])
    end
  end

  describe '.move_to_collection' do
    before do
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_a)
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_c)
      allow(described_class).to receive(:update_tag_by_element_ids)
    end

    it 'moves the samples from the source to the target collection' do
      described_class.move_to_collection([sample_a.id], [source_collection.id], [target_collection.id])

      expect(source_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_c)
      expect(target_collection.reload.sequence_based_macromolecule_samples).to contain_exactly(sample_a)
    end

    it 'refreshes the collection tag of the moved samples' do
      described_class.move_to_collection([sample_a.id], [source_collection.id], [target_collection.id])

      expect(described_class).to have_received(:update_tag_by_element_ids).with([sample_a.id])
    end
  end

  describe '.update_tag_by_element_ids' do
    it 'writes the collection ids into the sbmm sample tag' do
      described_class.create!(collection: source_collection, sequence_based_macromolecule_sample: sample_a)
      described_class.create!(collection: target_collection, sequence_based_macromolecule_sample: sample_a)

      described_class.update_tag_by_element_ids_without_delay([sample_a.id])

      expect(sample_a.reload.tag.taggable_data['collection_labels'])
        .to contain_exactly({ 'id' => source_collection.id }, { 'id' => target_collection.id })
    end
  end
end
