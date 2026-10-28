# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Residue do
  describe 'validation' do
    it 'accepts a polymer residue whose loading is not set yet' do
      residue = described_class.new(
        residue_type: 'polymer',
        custom_info: { 'formula' => 'CH', 'loading' => nil, 'loading_type' => 'external', 'external_loading' => '0.0' },
      )

      expect(residue).to be_valid
    end

    it 'persists the loading as a string' do
      residue = create(:residue)

      expect(residue.reload.custom_info['loading']).to eq('2')
    end
  end
end
