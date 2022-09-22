# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Inventory, type: :model do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let!(:inventory) { FactoryBot.create(:inventory, inventoriable: sample) }
    # let(:inventory) { create(:inventory, inventoriable: Sample) }

    it 'is possible to create a valid inventory' do
      expect(inventory.valid?).to be(true)
    end
  end
end
