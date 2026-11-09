# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionsSample do
  describe 'coefficient default' do
    it 'sets a missing coefficient to 1' do
      reactions_sample = create(:reactions_reactant_sample, coefficient: nil)

      expect(reactions_sample.reload.coefficient).to eq(1.0)
    end

    it 'sets a zero coefficient to 1' do
      reactions_sample = create(:reactions_reactant_sample, coefficient: 0)

      expect(reactions_sample.reload.coefficient).to eq(1.0)
    end

    it 'keeps a positive coefficient' do
      reactions_sample = create(:reactions_reactant_sample, coefficient: 2.5)

      expect(reactions_sample.reload.coefficient).to eq(2.5)
    end
  end
end
