# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PubChem' do
  describe 'most_occurance' do
    it 'returns the most common element' do
      target = [1, 2, 3, 4, 5, 1, 2, 3, 1]
      result = PubChem.most_occurance(target)
      expect(result).to eq 1

      target = [1, 2, 3, 4, 5, 1, 2, 3, 2, 3]
      result = PubChem.most_occurance(target)
      expect(result).to eq 2

      target = []
      result = PubChem.most_occurance(target)
      expect(result).to eq nil
    end
  end
end
