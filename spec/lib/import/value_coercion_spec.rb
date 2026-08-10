# frozen_string_literal: true

require 'rails_helper'

# Each case is [column, cell, stored value, whether the user is told something happened].
#
# The point of this class is that a cell the database would reject must not cost the row, and a cell
# that had to be changed must not be changed in silence -- so every case asserts both the value and
# whether a note was produced.
RSpec.describe Import::ValueCoercion do
  describe '.coerce' do
    reported = true
    silent = false

    [
      # Ranges. A single value keeps the open upper bound the sample form renders as a bare number.
      ['melting_point', '-114', '[-114.0, Infinity]', silent],
      ['melting_point', '120-125', '[120.0, 125.0]', silent],
      ['melting_point', '65...68', '[65.0, 68.0]', silent],
      ['melting_point', '120,5', '[120.5, Infinity]', silent],
      ['melting_point', '80 °C', '[80.0, Infinity]', silent],
      ['melting_point', nil, Import::ValueCoercion::UNKNOWN_RANGE, silent],
      # A reversed range is what Postgres refuses outright, taking the whole row with it.
      ['melting_point', '120-80', '[80.0, 120.0]', reported],
      ['melting_point', 'n/a', Import::ValueCoercion::UNKNOWN_RANGE, reported],
      ['melting_point', 'approx. 80 °C', '[80.0, Infinity]', reported],
      ['boiling_point', '78', '[78.0, Infinity]', silent],

      # Purity is validated 0..1, so a percentage used to cost the row rather than one cell.
      ['purity', '0.99', 0.99, silent],
      ['purity', nil, nil, silent],
      ['purity', '95', 0.95, reported],
      ['purity', '99%', 0.99, reported],
      ['purity', '150', nil, reported],
      ['purity', 'pure-ish', nil, reported],

      # Density is stored in g/mL, so a bare number is unambiguous and was being discarded.
      ['density', '0.789', 0.789, silent],
      ['density', '0.789 g/mL', 0.789, silent],
      ['density', '1.2 g/cm3', 1.2, silent],
      ['density', '1.2 kg/m3', nil, reported],
      ['density', 'not measured', nil, reported],

      # A blank numeric cell means "not given", not zero.
      ['refractive_index', nil, nil, silent],
      ['molecular_mass', '46.07', 46.07, silent],
      ['real_amount_value', 'lots', nil, reported],

      ['real_amount_unit', 'g', 'g', silent],
      ['real_amount_unit', 'G', 'g', reported],
      ['real_amount_unit', 'furlongs', nil, reported],
    ].each do |column, cell, expected, expect_note|
      context "with #{column} = #{cell.inspect}" do
        let(:result) { described_class.coerce(column, cell) }

        it "stores #{expected.inspect}" do
          expect(result.first).to eq(expected)
        end

        it(expect_note ? 'reports what it did' : 'says nothing') do
          expect(result.last.nil?).to be(!expect_note)
        end
      end
    end

    it 'leaves columns it does not own alone' do
      expect(described_class.coerce('cas', '64-17-5')).to be_nil
    end

    it 'reads U+2212 as a minus sign rather than a range separator' do
      expect(described_class.coerce('melting_point', '−5–10').first).to eq('[-5.0, 10.0]')
    end

    it 'names the offending value in the note, so a report can be acted on' do
      expect(described_class.coerce('purity', 'pure-ish').last).to include('"pure-ish"')
    end
  end

  describe '.handles?' do
    it 'claims the typed columns' do
      expect(described_class).to be_handles('melting_point')
    end

    it 'leaves everything else to the caller' do
      expect(described_class).not_to be_handles('description')
    end
  end
end
