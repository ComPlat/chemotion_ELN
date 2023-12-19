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
  end
end
