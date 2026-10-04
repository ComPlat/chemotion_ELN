# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsSections do
  let(:numbered) { ['1. Identification', 'name', '2. Hazard(s) identification', 'hazard', '3. Composition'] }
  let(:labelled) { ['SECTION 1: IDENTIFICATION', 'name', 'SECTION 2: HAZARDS', 'hazard', 'SECTION 3: COMPOSITION'] }

  describe '.detect' do
    it 'picks the numbered layout from numbered headings', :aggregate_failures do
      sections = described_class.detect(numbered)
      expect(sections.style).to eq(:fisher)
      expect(sections.found).to eq([1, 2, 3])
    end

    it 'picks the labelled layout from SECTION headings', :aggregate_failures do
      sections = described_class.detect(labelled)
      expect(sections.style).to eq(:sigma)
      expect(sections.lines_of(2)).to eq(['hazard'])
    end

    it 'reads German ABSCHNITT headings as the labelled layout' do
      expect(described_class.detect(['ABSCHNITT 1: Bezeichnung', 'ABSCHNITT 2: Gefahren']).style).to eq(:sigma)
    end

    it 'falls back to the labelled layout when neither chain is found', :aggregate_failures do
      sections = described_class.detect(['no headings here'])
      expect(sections.style).to eq(:sigma)
      expect(sections.found).to be_empty
    end
  end

  describe '#lines_of' do
    it 'bounds a section by the next heading in the chain' do
      expect(described_class.new(numbered, :fisher).lines_of(1)).to eq(['name'])
    end

    it 'ignores a numbered list item that breaks the 1, 2, 3 chain' do
      lines = ['1. Identification', '3. not a heading', '2. Hazards', 'hazard']
      expect(described_class.new(lines, :fisher).lines_of(2)).to eq(['hazard'])
    end

    it 'refuses a heading that appears twice', :aggregate_failures do
      sections = described_class.new(['1. Identification', '2. Hazards', 'a', '2. Hazards again', 'b'], :fisher)
      expect(sections.lines_of(2)).to be_nil
      expect(sections.ambiguous?(2)).to be true
    end
  end
end
