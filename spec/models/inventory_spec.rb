# frozen_string_literal: true

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
end
