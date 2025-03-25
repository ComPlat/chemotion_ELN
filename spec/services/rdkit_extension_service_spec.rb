# frozen_string_literal: true

require 'rails_helper'

describe RdkitExtensionService do
  let(:molfile)         { build(:molfile, type: :aromatics) }
  let(:smiles)          { build(:smiles, from_ctab: molfile) }
  let(:invalid_smiles)  { build(:smiles, type: :invalid) }
  let(:faulty_smiles)   { build(:smiles, type: :faulty) }
  let(:faulty_molfile)  { build(:molfile, type: :invalid) }
  let(:faulty_smiles2)  { build(:smiles, from_ctab: faulty_molfile) }
  # let(:faulty_smiles3) { Chemotion::OpenBabelService.get_smiles_from_molfile(faulty_molfile) }

  describe '#ctab_to_smiles' do
    it 'converts molfile to smiles' do
      expect(described_class.ctab_to_smiles(molfile)).to eq(smiles)
    end
  end

  describe '#smiles_to_ctab' do
    it 'does converts faulty smiles to molfile' do
      # expect to produce a molfile with 50 lines
      result = described_class.smiles_to_ctab(faulty_smiles)
      expect(result).to be_a(String)
      expect(result.split("\n").size).to eq(47)
    end

    it 'does not converts invalid smiles to molfile' do
      expect(described_class.smiles_to_ctab(invalid_smiles)).to be_nil
      expect(described_class.smiles_to_ctab(faulty_smiles2)).to be_nil
    end
  end

  describe '#valid_smiles?' do
    it 'returns true for valid smiles' do
      expect(described_class.send(:valid_smiles?, smiles)).to be_truthy
    end

    it 'returns false for invalide string' do
      expect(described_class.send(:valid_smiles?, invalid_smiles)).to be_falsey
    end
  end
end
