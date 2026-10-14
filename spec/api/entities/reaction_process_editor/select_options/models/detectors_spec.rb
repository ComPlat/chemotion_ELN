# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Models::Detectors do
  describe '#select_options_for' do
    it 'maps detectors to options' do
      expect(described_class.new.select_options_for(['CHMO:0001728'])).to include(
        hash_including({ 'value' => 'CHMO:0001728', 'label' => 'PDA' }),
      )
    end
  end
end
