# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsValueParser do
  subject(:parser) { described_class.new(section_text) }

  let(:section_text) { 'Density : 0,773 g/cm3 (25 °C)' }

  describe '#decimal_style' do
    it 'reads a comma as the decimal separator on an English Sigma sheet' do
      expect(parser.decimal_style).to eq(:german)
    end

    it 'is not swayed by the subsection numbering' do
      styled = described_class.new("9.1 Information\n Density : 0,785 g/cm3")
      expect(styled.decimal_style).to eq(:german)
    end

    it 'reads a thousands separator alongside a decimal comma' do
      styled = described_class.new('Vapour pressure : 1.393,72 hPa')
      expect(styled.decimal_style).to eq(:german)
    end

    it 'stays English when the sheet writes 57.2 °F' do
      styled = described_class.new('Flash Point 14 °C / 57.2 °F')
      expect(styled.decimal_style).to eq(:english)
    end

    it 'refuses to choose when both conventions carry a decimal' do
      styled = described_class.new('a 0,5 °C b 0.5 °C')
      expect(styled.decimal_style).to eq(:ambiguous)
    end
  end

  describe '#parse_quantity' do
    it 'normalises the decimal comma and keeps the condition', :aggregate_failures do
      parsed = parser.parse_quantity('0,773 g/cm3 (25 °C)')
      expect(parsed['display']).to eq('0.773 g/cm3 (25 °C)')
      expect(parsed['value']).to eq(0.773)
      expect(parsed['unit']).to eq('g/cm3')
    end

    it 'prefers Celsius over the Fahrenheit twin' do
      english = described_class.new('Flash Point 14 °C / 57.2 °F')
      expect(english.parse_quantity('14  °C  /  57.2  °F')['display']).to eq('14 °C')
    end

    it 'keeps the digits as written' do
      english = described_class.new('Density 0.770')
      expect(english.parse_quantity('0.770')['display']).to eq('0.770')
    end

    it 'omits an absence marker' do
      expect(parser.parse_quantity('No data available')['reason']).to eq('absent')
    end

    it 'omits a qualified value' do
      expect(parser.parse_quantity('> 4 °C')['reason']).to eq('qualifier')
    end

    it 'omits a range unless the caller can hold one', :aggregate_failures do
      english = described_class.new('Melting point 12 - 13 °C')
      expect(english.parse_quantity('12 - 13 °C')['reason']).to eq('range')
      expect(english.parse_quantity('12 - 13 °C', allow_range: true)['display']).to eq('12 - 13 °C')
    end

    it 'omits a trailer that is not a measurement condition' do
      expect(parser.parse_quantity('146 g/l at 25 °C - partly soluble')['reason'])
        .to eq('unparsed_condition')
    end

    it 'omits a value it cannot reduce to a number and a unit' do
      expect(parser.parse_quantity('Vapors may form explosive mixtures with air')['reason'])
        .to eq('unparsed')
    end

    it 'refuses every comma number while the convention is unsettled' do
      ambiguous = described_class.new('a 0,5 °C b 0.5 °C')
      expect(ambiguous.parse_quantity('1,5 °C')['reason']).to eq('unparsed_number')
    end

    it 'drops the literature marker Sigma appends' do
      expect(parser.parse_quantity('0,861 g/cm3 at 20 °C - lit.')['display'])
        .to eq('0.861 g/cm3 (20 °C)')
    end
  end

  describe '#parse_text' do
    it 'keeps a short free-text value' do
      expect(parser.parse_text('Clear Colorless - Light yellow')['display'])
        .to eq('Clear Colorless - Light yellow')
    end

    it 'omits an absence marker' do
      expect(parser.parse_text('No information available')['reason']).to eq('absent')
    end
  end
end
