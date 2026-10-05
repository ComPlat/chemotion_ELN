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

    it 'refuses a heading when the sheet repeats its sections', :aggregate_failures do
      copy = ['1. Identification', '2. Hazards', 'a', '3. Composition']
      sections = described_class.new(copy + copy, :fisher)
      expect(sections.lines_of(2)).to be_nil
      expect(sections.ambiguous?(2)).to be true
    end

    it 'reads a section holding a numbered body line that repeats its number', :aggregate_failures do
      lines = ['1. Identification', '2. Hazards', 'P305', '2. Rinse cautiously with water', '3. Composition']
      sections = described_class.new(lines, :fisher)
      expect(sections.ambiguous?(2)).to be false
      expect(sections.lines_of(2)).to eq(['P305', '2. Rinse cautiously with water'])
    end

    it 'ignores a short numbered list after the last heading' do
      headings = ['3. Composition', '4. First aid', '5. Fire', '6. Release']
      lines = ['1. Identification', '2. Hazards', 'h', *headings, '1. Call', '2. Rinse']
      expect(described_class.new(lines, :fisher).lines_of(2)).to eq(['h'])
    end
  end
end
