# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsPhraseParser do
  describe '.codes' do
    it 'reads codes, category letters and combinations' do
      text = 'H225 H360FD H350i EUH209A P305 + P351 + P338'
      expect(described_class.codes(text, 'H')).to eq(%w[H225 H360FD H350i EUH209A])
    end

    it 'keeps a combination as one code' do
      expect(described_class.codes(['P305 + P351 + P338'], 'P')).to eq(%w[P305+P351+P338])
    end

    it 'stops at the category letters when the wording is glued to the code' do
      expect(described_class.codes('H225Highly flammable H300Fatal H361fdSuspected', 'H'))
        .to eq(%w[H225 H300 H361fd])
    end

    it 'reads codes glued to each other' do
      expect(described_class.codes('H225H319', 'H')).to eq(%w[H225 H319])
    end

    it 'ignores a formula or a code inside a word', :aggregate_failures do
      expect(described_class.codes('H2O', 'H')).to be_empty
      expect(described_class.codes('NH300', 'H')).to be_empty
    end
  end
end
