# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::ManagedCollection do
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner) }
  let(:admin) { create(:admin) }

  it 'refuses system collections and collections of groups' do
    locked = described_class.new(collection: create(:collection, user: owner, is_locked: true), created_by: admin)
    group_owned = described_class.new(collection: create(:collection, user: create(:group)), created_by: admin)
    expect(locked).not_to be_valid
    expect(group_owned.tap(&:valid?).errors[:collection]).to include('must belong to a person')
  end

  it 'flags the samples already in the collection' do
    sample = create(:sample, creator: owner, collections: [collection])
    described_class.create!(collection: collection, created_by: admin).mark_inventory_samples!
    expect(sample.reload.inventory_sample).to be true
  end

  it 'flags samples added later, also through raw SQL, until it is archived' do
    inventory = described_class.create!(collection: collection, created_by: admin)
    added = create(:sample, creator: owner)
    CollectionsSample.insert_in_collection([added.id], [collection.id])
    expect(added.reload.inventory_sample).to be true

    inventory.update!(archived_at: Time.current)
    later = create(:sample, creator: owner)
    CollectionsSample.insert_in_collection([later.id], [collection.id])
    expect(later.reload.inventory_sample).to be false
  end
end
