# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Inventory' do
  describe 'creation' do
    let(:inventory) { create(:inventory) }
    let(:collection) { create(:collection) }

    it 'is possible to create a valid inventory' do
      expect(inventory.valid?).to be true
    end

    it 'increment inventory_label_counter' do
      inventory = Inventory.update_inventory_label('BNC', 'Bräse Nord Campus', 10, collection.id)
      updated_inventory = inventory.increment_inventory_label_counter(collection.id)
      expect(updated_inventory['counter']).to eq(11)
    end

    it 'update inventory label prefix and counter' do
      inventory = Inventory.update_inventory_label('BNC', 'Bräse Nord Campus', 10, collection.id)
      expect(inventory['counter']).to eq(10)
      expect(inventory['prefix']).to eq('BNC')
      expect(inventory['prefix']).to eq('BNC')
    end

    it 'returns true when inventory label matches the next inventory counter' do
      expect(inventory.match_inventory_counter('INV-123', 123)).to be true
    end

    it 'returns false when inventory label does not match the next inventory counter' do
      expect(inventory.match_inventory_counter('INV-123', 124)).to be false
    end

    it 'assigns the correct inventory label' do
      expect(inventory.construct_inventory_label('INV', 123)).to eq('INV-123')
    end
  end
end
