# frozen_string_literal: true

# == Schema Information
#
# Table name: inventories
#
#  id         :bigint           not null, primary key
#  counter    :integer          default(0)
#  name       :string
#  prefix     :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_inventories_on_prefix  (prefix) UNIQUE
#
require 'rails_helper'

RSpec.describe Inventory do
  describe 'creation' do
    let(:prefix) { 'INV' }
    let(:counter) { 123 }
    let(:inventory) { create(:inventory, prefix: prefix, counter: counter) }
    let(:collection) { create(:collection) }

    it 'is possible to create a valid inventory' do
      expect(inventory.valid?).to be true
    end

    it 'increment inventory_label_counter' do
      invent = described_class.update_inventory_label('BNC', 'Bräse Nord Campus', 10, collection.id)
      invent.update_incremented_counter
      expect(invent['counter']).to eq(11)
    end

    it 'update inventory label prefix and counter' do
      inventory = described_class.update_inventory_label('BNC', 'Bräse Nord Campus', 10, collection.id)
      expect(inventory['counter']).to eq(10)
      expect(inventory['prefix']).to eq('BNC')
      expect(inventory['prefix']).to eq('BNC')
    end

    it 'returns true when inventory label matches the next inventory counter' do
      expect(inventory.match_inventory_counter('INV-124')).to be true
    end

    it 'returns false when inventory label does not match the next inventory counter' do
      expect(inventory.match_inventory_counter('INV-123')).to be false
    end

    it 'assigns the correct inventory label' do
      expect(inventory.label).to eq("#{prefix}-#{counter}")
    end
  end

  describe '.create_or_update_inventory_label' do
    let(:user) { create(:person) }
    let(:collection_a) { create(:collection, user: user) }
    let(:collection_b) { create(:collection, user: user) }
    let(:collection_c) { create(:collection, user: user) }
    let!(:sample_a) { create(:sample, collections: [collection_a], inventory_sample: false) }
    let!(:sample_b) { create(:sample, collections: [collection_b], inventory_sample: false) }
    let!(:sample_c) { create(:sample, collections: [collection_c], inventory_sample: false) }

    def label(prefix, name, ids)
      described_class.create_or_update_inventory_label(prefix, name, 0, ids, user)
    end

    it 'flags the samples of collections that get their first inventory label' do
      label('ABC', 'Inventory ABC', [collection_a.id, collection_b.id])

      expect([sample_a, sample_b].map { |s| s.reload.inventory_sample }).to all(be true)
      expect(sample_c.reload.inventory_sample).to be false
    end

    context 'when the collections already belong to an inventory' do
      before do
        label('ABC', 'Inventory ABC', [collection_a.id, collection_b.id])
        label('XYZ', 'Inventory XYZ', [collection_c.id])
        Sample.update_all(inventory_sample: false) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'does not flag samples when collections from different inventories are re-grouped' do
        label('NEW', 'New inventory', [collection_a.id, collection_c.id])

        expect(collection_a.reload.inventory).to eq(collection_c.reload.inventory)
        expect([sample_a, sample_b, sample_c].map { |s| s.reload.inventory_sample }).to all(be false)
      end

      it 'does not flag samples when the label of part of an inventory is reset' do
        label(nil, nil, [collection_a.id])

        expect(collection_a.reload.inventory.prefix).to be_nil
        expect([sample_a, sample_b].map { |s| s.reload.inventory_sample }).to all(be false)
      end

      it 'does not flag samples when the label of a whole inventory is reset' do
        label(nil, nil, [collection_a.id, collection_b.id])

        expect([sample_a, sample_b].map { |s| s.reload.inventory_sample }).to all(be false)
      end
    end

    it 'does not flag samples when resetting a collection without an inventory' do
      label(nil, nil, [collection_c.id])

      expect(sample_c.reload.inventory_sample).to be false
    end
  end
end
