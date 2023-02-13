# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemical, type: :model do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let!(:chemical) { FactoryBot.create(:chemical, sample_id: sample.id) }

    it 'is possible to create a valid chemical entry' do
      expect(chemical.valid?).to be(true)
    end
  end
end
