# frozen_string_literal: true

require 'rails_helper'

describe Entities::MoleculeEntity do
  describe '#molfile' do
    subject(:molfile_output) do
      molecule = build_stubbed(:molecule)
      allow(molecule).to receive(:molfile).and_return(binary_molfile)
      described_class.represent(molecule).serializable_hash[:molfile]
    end

    let(:textnode_molfile) { file_fixture('polymer_with_textnode.mol').read }
    # .b simulates bytea → ASCII-8BIT as returned by PostgreSQL
    let(:binary_molfile) { textnode_molfile.b }

    it 'preserves non-ASCII characters when molfile bytes are ASCII-8BIT' do
      expect(molfile_output).to include('α-Al2O3')
    end

    it 'returns a valid UTF-8 string' do
      expect(molfile_output.encoding.name).to eq('UTF-8')
      expect(molfile_output.valid_encoding?).to be true
    end

    it 'does not replace non-ASCII bytes with U+FFFD' do
      expect(molfile_output).not_to include("\u{FFFD}")
    end

    it 'returns nil when molfile is nil' do
      molecule = build_stubbed(:molecule)
      allow(molecule).to receive(:molfile).and_return(nil)
      result = described_class.represent(molecule).serializable_hash[:molfile]
      expect(result).to be_nil
    end
  end
end
