# frozen_string_literal: true

require 'rails_helper'

RSpec.describe WellPosition do
  describe '.from_string' do
    it 'parses a single-letter row and a column' do
      position = described_class.from_string('B12')

      expect(position).to have_attributes(x: 12, y: 2)
    end

    it 'parses zero-padded columns' do
      expect(described_class.from_string('A0003')).to have_attributes(x: 3, y: 1)
    end

    it 'parses double-letter rows' do
      expect(described_class.from_string('AA1')).to have_attributes(x: 1, y: 27)
    end

    it 'returns nil for a blank string' do
      expect(described_class.from_string('')).to be_nil
    end

    it 'round-trips with #alphanumeric_position' do
      position = described_class.new(x: 7, y: 30)

      expect(described_class.from_string(position.to_s)).to eq position
    end
  end

  describe '.from_dimension' do
    it 'returns one position per well' do
      expect(described_class.from_dimension(3, 2).size).to eq 6
    end

    it 'orders positions row by row' do
      labels = described_class.from_dimension(2, 2).map(&:to_s)

      expect(labels).to eq %w[A0001 A0002 B0001 B0002]
    end

    it 'defaults to a 12x8 plate' do
      positions = described_class.from_dimension

      expect(positions.size).to eq 96
      expect(positions.last).to eq described_class.new(x: 12, y: 8)
    end

    it 'returns an empty list for a zero dimension' do
      expect(described_class.from_dimension(0, 0)).to eq []
    end
  end

  describe '#initialize' do
    it 'accepts the bounds 1 and 100' do
      expect(described_class.new(x: 100, y: 1)).to have_attributes(x: 100, y: 1)
    end

    it 'raises for a position below 1' do
      expect { described_class.new(x: 0, y: 1) }.to raise_error(RuntimeError, /Invalid position/)
    end

    it 'raises for a position above 100' do
      expect { described_class.new(x: 1, y: 101) }.to raise_error(RuntimeError, /Invalid position/)
    end
  end

  describe '#<=>' do
    it 'sorts by row before column' do
      a2 = described_class.new(x: 2, y: 1)
      b1 = described_class.new(x: 1, y: 2)

      expect([b1, a2].sort).to eq [a2, b1]
    end
  end

  describe '#==' do
    it 'is true for the same coordinates' do
      position = described_class.new(x: 3, y: 4)

      expect(position).to eq described_class.from_string('D3')
    end

    it 'is false for different coordinates' do
      expect(described_class.new(x: 3, y: 4)).not_to eq described_class.new(x: 4, y: 3)
    end

    it 'is false for objects of another class' do
      expect(described_class.new(x: 1, y: 1)).not_to eq 'A0001'
    end
  end

  describe '#alphanumeric_position' do
    it 'combines the row letter with a zero-padded column' do
      expect(described_class.new(x: 3, y: 2).alphanumeric_position).to eq 'B0003'
    end

    it 'uses double letters beyond row Z' do
      expect(described_class.new(x: 1, y: 27).to_s).to eq 'AA0001'
    end
  end
end
