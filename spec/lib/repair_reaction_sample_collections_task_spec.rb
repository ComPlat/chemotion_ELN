# frozen_string_literal: true

require 'rails_helper'

RSpec.describe RepairReactionSampleCollectionsTask do
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner, label: 'reactions') }
  let(:reaction) { create(:reaction, creator: owner, collections: [collection]) }
  # v3.x's sample factory always adds a collection of a default user; drop it, so the sample is only
  # held for +owner+.
  let(:sample) do
    create(:sample, creator: owner, collections: [collection]).tap do |s|
      CollectionsSample.where(sample_id: s.id).where.not(collection_id: collection.id).delete_all
    end
  end

  # Links +sample+ to +reaction+ (the hook adds it to the reaction's collections), then drops that
  # membership again so the reaction is in +collection+ without it.
  def link_and_strip(model = ReactionsPurificationSolventSample, target = sample)
    model.create!(reaction: reaction, sample: target)
    CollectionsSample.where(sample_id: target.id, collection_id: collection.id).delete_all
  end

  def member?(target = sample)
    CollectionsSample.exists?(sample_id: target.id, collection_id: collection.id)
  end

  it 'adds the missing membership of a reaction sample' do
    link_and_strip

    results = described_class.execute!(dry_run: false)

    expect(member?).to be true
    expect(results.map(&:to_a)).to eq([[collection.id, sample.id, reaction.id, :added]])
  end

  %w[
    ReactionsStartingMaterialSample ReactionsReactantSample ReactionsSolventSample
    ReactionsPurificationSolventSample ReactionsProductSample
  ].each do |type|
    it "repairs a #{type}" do
      link_and_strip(type.constantize)

      described_class.execute!(dry_run: false)

      expect(member?).to be true
    end
  end

  it 'revives a soft-deleted membership instead of inserting a second row' do
    ReactionsPurificationSolventSample.create!(reaction: reaction, sample: sample)
    CollectionsSample.find_by(sample_id: sample.id, collection_id: collection.id).destroy!

    results = described_class.execute!(dry_run: false)

    expect(results.map(&:action)).to eq([:revived])
    rows = CollectionsSample.with_deleted.where(sample_id: sample.id, collection_id: collection.id)
    expect(rows.pluck(:deleted_at)).to eq([nil])
  end

  it 'writes nothing on a dry run' do
    link_and_strip

    results = nil
    expect { results = described_class.execute!(dry_run: true) }.not_to change(CollectionsSample, :count)
    expect(results.map(&:action)).to eq([:added])
  end

  it 'adds a sample that is in no collection at all' do
    link_and_strip
    CollectionsSample.where(sample_id: sample.id).delete_all

    described_class.execute!(dry_run: false)

    expect(member?).to be true
  end

  it 'reports, and leaves alone, a sample owned by another user' do
    other = create(:person)
    foreign = create(:sample, creator: other, collections: [create(:collection, user: other)])
    link_and_strip(ReactionsPurificationSolventSample, foreign)
    CollectionsSample.where(sample_id: foreign.id, collection_id: Collection.get_all_collection_for_user(owner.id))
                     .delete_all

    results = described_class.execute!(dry_run: false)

    expect(member?(foreign)).to be false
    expect(results.find { |r| r.sample_id == foreign.id }&.action).to eq(:cross_owner)
  end

  it "adds the sharer's sample to a collection shared by the sharer" do
    recipient = create(:person)
    shared = create(:collection, user: recipient, shared_by_id: owner.id, is_shared: true)
    CollectionsReaction.create!(reaction: reaction, collection: shared)
    ReactionsPurificationSolventSample.create!(reaction: reaction, sample: sample)
    CollectionsSample.where(sample_id: sample.id, collection_id: shared.id).delete_all

    results = described_class.execute!(dry_run: false)

    expect(results.find { |r| r.collection_id == shared.id }&.action).to eq(:added)
    expect(CollectionsSample.exists?(sample_id: sample.id, collection_id: shared.id)).to be true
  end

  context 'when a side of the pair is gone' do
    before { link_and_strip }

    {
      'a deleted reaction' => -> { reaction.destroy! },
      'a deleted sample' => -> { sample.destroy! },
      'a deleted collection' => -> { collection.destroy! },
      'a deleted reaction sample link' => -> { ReactionsSample.where(reaction: reaction).destroy_all },
      'a reaction removed from the collection' => lambda {
        CollectionsReaction.where(reaction: reaction, collection: collection).destroy_all
      },
    }.each do |label, removal|
      it "ignores #{label}" do
        instance_exec(&removal)

        expect(described_class.execute!(dry_run: false).select { |r| r.sample_id == sample.id }).to be_empty
      end
    end
  end

  it 'adds the collection to the sample tag' do
    link_and_strip
    sample.tag.update!(taggable_data: (sample.tag.taggable_data || {}).except('collection_labels'))

    described_class.execute!(dry_run: false)

    expect(sample.tag.reload.taggable_data['collection_labels'].pluck('id')).to include(collection.id)
  end

  it 'is idempotent' do
    link_and_strip
    described_class.execute!(dry_run: false)

    expect(described_class.execute!(dry_run: false)).to be_empty
  end
end
