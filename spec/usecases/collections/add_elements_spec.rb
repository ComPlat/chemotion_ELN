# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Collections::AddElements do
  let(:sharee) { create(:person) }
  let(:owner)  { create(:person) }
  let(:add)    { CollectionShare.permission_level(:add_elements) }

  let(:origin) { create(:collection, user: owner, label: 'origin (owner)') }
  let(:same_owner_target) { create(:collection, user: owner, label: 'target (owner)') }
  let(:sharee_collection) { create(:collection, user: sharee, label: 'my collection') }
  let(:sample) { create(:sample, creator: owner, collections: [origin]) }

  before do
    create(:collection_share, collection: origin, shared_with: sharee, permission_level: add)
    create(:collection_share, collection: same_owner_target, shared_with: sharee, permission_level: add)
    sample
  end

  def perform(target, origin_collection_id)
    described_class.new(sharee).perform!(
      collection_id: target.id,
      ui_state: { sample: { checkedIds: [sample.id] } }.with_indifferent_access,
      origin_collection_id: origin_collection_id,
    )
  end

  context 'when a sharee moves an element out of a shared (non-owned) collection' do
    it 'allows a target owned by the same owner as the origin' do
      expect { perform(same_owner_target, origin.id) }
        .to change { sample.reload.collections.exists?(id: same_owner_target.id) }.from(false).to(true)
    end

    it 'refuses a target owned by someone else (the sharee themself)' do
      expect { perform(sharee_collection, origin.id) }
        .to raise_error(Usecases::Collections::Errors::InsufficientPermissionError)
      expect(sample.reload.collections.exists?(id: sharee_collection.id)).to be false
    end
  end

  context "when the origin is the sharee's own collection" do
    let(:own_sample) { create(:sample, creator: sharee, collections: [sharee_collection]) }

    it 'is unconstrained — the element may be added to a collection of another owner they can add to' do
      described_class.new(sharee).perform!(
        collection_id: same_owner_target.id,
        ui_state: { sample: { checkedIds: [own_sample.id] } }.with_indifferent_access,
        origin_collection_id: sharee_collection.id,
      )
      expect(own_sample.reload.collections.exists?(id: same_owner_target.id)).to be true
    end
  end
end
