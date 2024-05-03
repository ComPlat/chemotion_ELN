# frozen_string_literal: true

require 'rails_helper'

describe Entities::InventoryEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(inventory)
    end

    let(:inventory) { create(:inventory) }

    it 'returns all necessary data' do
      expect(grape_entity_as_hash).to include(
        :id,
        :prefix,
        :name,
        :counter,
      )
    end
  end
end
