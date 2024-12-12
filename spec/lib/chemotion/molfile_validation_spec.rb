# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::MolfileValidation, type: :module do
  let(:corrupt_molfile) { "Status: 400\nCode: PUGREST.BadRequest\nMessage: Unable to standardize the given structure" }
  let(:invalid_molfile) { Rails.root.join('spec/fixtures/structures/invalid_01.mol').read }
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
        allow(Chemotion::OpenBabelService).to receive(:molfile_clear_hydrogens).and_return(corrupt_molfile)
      end

      it 'returns nil if the molfile is invalid' do
        expect(Chemotion::OpenBabelService).not_to have_received(:molfile_clear_hydrogens)
        result = described_class.validate_and_clear_molfile(corrupt_molfile)
        expect(result).to be_nil
      end
    end

    context 'when the fetched molfile using PubchemService is corrupt' do
      let(:faulty_smile) { Chemotion::OpenBabelService.get_smiles_from_molfile(invalid_molfile) }

      before do
        allow(Chemotion::PubchemService).to receive(:molfile_from_smiles).with(faulty_smile).and_return(corrupt_molfile)
      end

      it 'returns nil if the molfile is invalid' do
        resulting_corrupt_molfile = Chemotion::PubchemService.molfile_from_smiles(faulty_smile)
        expect(resulting_corrupt_molfile).to eq(corrupt_molfile)
      end
    end
  end

  describe '.validate_molfile' do
    it 'returns false for a valid molfile' do
      expect(described_class.invalid_molfile?(valid_molfile)).to be(false)
    end

    it 'returns true for an invalid molfile' do
      expect(described_class.invalid_molfile?(corrupt_molfile)).to be(true)
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
