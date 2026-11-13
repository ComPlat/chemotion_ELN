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

    it 'stays unsettled when no number decides' do
      expect(described_class.new('Flash point 70 °C Density 1,022 g/cm3').decimal_style).to eq(:unsettled)
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

    it 'omits a lone three-digit group no number of the sheet settles', :aggregate_failures do
      unsettled = described_class.new('Flash point 70 °C Density 1,022 g/cm3')
      expect(unsettled.parse_quantity('1,022 g/cm3')['reason']).to eq('unparsed_number')
      expect(unsettled.parse_quantity('1.013 hPa')['reason']).to eq('unparsed_number')
      expect(unsettled.parse_quantity('0.770')['display']).to eq('0.770')
    end

    it 'refuses every comma number while the convention is unsettled' do
      ambiguous = described_class.new('a 0,5 °C b 0.5 °C')
      expect(ambiguous.parse_quantity('1,5 °C')['reason']).to eq('unparsed_number')
    end

    it 'drops the literature marker Sigma appends' do
      expect(parser.parse_quantity('0,861 g/cm3 at 20 °C - lit.')['display'])
        .to eq('0.861 g/cm3 (20 °C)')
    end

    context 'with a value below zero' do
      let(:section_text) { 'Melting point -114 °C Boiling point 78.3 °C' }

      it 'keeps the sign', :aggregate_failures do
        parsed = parser.parse_quantity('-114 °C')
        expect(parsed['display']).to eq('-114 °C')
        expect(parsed['value']).to eq(-114.0)
        expect(parsed['unit']).to eq('°C')
      end

      it 'reads a typographic minus' do
        expect(parser.parse_quantity('−98 °C')['value']).to eq(-98.0)
      end

      it 'keeps the condition' do
        expect(parser.parse_quantity('-20 °C (1013 hPa)')['condition']).to eq('1013 hPa')
      end

      it 'prefers Celsius over the Fahrenheit twin' do
        expect(parser.parse_quantity('−4 °C / 24.8 °F')['display']).to eq('-4 °C')
      end

      it 'reads a range with negative bounds', :aggregate_failures do
        expect(parser.parse_quantity('-5 - 3 °C', allow_range: true)['value']).to eq([-5.0, 3.0])
        expect(parser.parse_quantity('-20 - -10 °C', allow_range: true)['value']).to eq([-20.0, -10.0])
      end

      it 'normalises a decimal comma' do
        german = described_class.new('Dichte 0,79 g/cm3')
        expect(german.parse_quantity('-2,5 °C')['value']).to eq(-2.5)
      end
    end

    it 'omits a cell that holds only a dash', :aggregate_failures do
      %w[- – —].each do |dash|
        expect(parser.parse_quantity(dash)['reason']).to eq('absent')
      end
    end
  end

  describe 'on hostile text' do
    it 'scans a long digit run without backtracking over every start' do
      parser = described_class.new("#{'1' * 200_000} x")
      expect(Benchmark.realtime { parser.decimal_style }).to be < 1
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

    it 'omits a cell that holds only a dash' do
      expect(parser.parse_text('–')['reason']).to eq('absent')
    end

    it 'keeps a word that merely starts like an absence marker' do
      expect(parser.parse_text('Nadeln')['display']).to eq('Nadeln')
    end
  end
end
