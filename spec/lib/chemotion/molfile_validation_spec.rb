# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::MolfileValidation, type: :module do
  let(:invalid_molfile) { "Status: 400\nCode: PUGREST.BadRequest\nMessage: Unable to standardize the given structure" }
  let(:valid_molfile) { Rails.root.join('spec/fixtures/structures/valid_01.mol').read }

  describe '.validate_and_clear_molfile' do
    context 'when the molfile is valid' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:molfile_clear_hydrogens).and_return(valid_molfile)
      end

      it 'returns molfile if it is valid' do
        result = described_class.validate_and_clear_molfile(valid_molfile)
        expect(result).to eq(valid_molfile)
      end
    end

    context 'when the molfile is invalid' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:molfile_clear_hydrogens).and_return(invalid_molfile)
      end

      it 'returns nil if the molfile is invalid' do
        expect(Chemotion::OpenBabelService).not_to have_received(:molfile_clear_hydrogens)
        result = described_class.validate_and_clear_molfile(invalid_molfile)
        expect(result).to be_nil
      end
    end
  end

  describe '.validate_molfile' do
    it 'returns true for a valid molfile' do
      expect(described_class.invalid_molfile?(valid_molfile)).to be(false)
    end

    it 'returns false for an invalid molfile' do
      expect(described_class.invalid_molfile?(invalid_molfile)).to be(true)
    end
  end

  describe '.parse_to_hash' do
    let(:valid_input) { "Status: 200\nName: Valid Molecule\n" }
    let(:parsed_output) { { 'Status' => '200', 'Name' => 'Valid Molecule' } }

    it 'parses the input into a hash' do
      expect(described_class.parse_to_hash(valid_input)).to eq(parsed_output)
    end

    it 'ignores lines without the correct format' do
      input_with_noise = "Status: 200\nInvalid Line\nName: Valid Molecule\n"
      expect(described_class.parse_to_hash(input_with_noise)).to eq(parsed_output)
    end

    it 'returns an empty hash for empty input' do
      expect(described_class.parse_to_hash('')).to eq({})
    end
  end
end
