# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::MoleculeFetcher do
  let(:smiles) { 'CCO' }
  let(:babel_info) do
    {
      inchikey: 'InChI=1S/CH2O/c1-2/h1H2',
      molfile:
        "OpenBabel11292408462D

          2  1  0  0  0  0  0  0  0  0999 V2000
            1.0000   -0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -0.0000   -0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  2  0  0  0  0
        M  END",
    }
  end
  let(:fetcher) { described_class.new(smiles, babel_info) }
  let(:dummy_molecule) { create(:molecule, inchikey: 'DUMMY', is_partial: true) }

  describe '#fetch_or_create' do
    context 'when molecule exists' do
      let!(:existing_molecule) { create(:molecule, inchikey: babel_info[:inchikey], is_partial: false) }

      it 'returns the existing molecule' do
        expect(fetcher.fetch_or_create).to eq(existing_molecule)
      end
    end

    context 'when molecule does not exist but molfile is available' do
      before do
        allow(fetcher).to receive(:fetch_molfile).and_return(babel_info[:molfile])
        allow(Molecule).to receive(:find_or_create_by_molfile).and_return(dummy_molecule)
      end

      it 'creates a new molecule from the molfile' do
        expect(fetcher.fetch_or_create).to eq(dummy_molecule)
        expect(Molecule).to have_received(:find_or_create_by_molfile).with(babel_info[:molfile], babel_info)
      end
    end

    context 'when molecule and molfile are unavailable' do
      before { allow(fetcher).to receive(:fetch_molfile).and_return(nil) }

      it 'returns nil' do
        expect(fetcher.fetch_or_create).to be_nil
      end
    end
  end

  describe '#fetch_molfile' do
    it 'fetches molfile from babel_info if available' do
      expect(fetcher.send(:fetch_molfile)).to eq(babel_info[:molfile])
    end

    context 'when not in babel_info but available from RDKit or PubChem' do
      before { allow(fetcher).to receive_messages(rdkit_molfile: nil, pubchem_molfile: babel_info[:molfile]) }

      it 'fetches molfile from PubChem' do
        expect(fetcher.send(:fetch_molfile)).to eq(babel_info[:molfile])
      end
    end
  end

  describe '#rdkit_molfile' do
    let(:rw_mol) { instance_double(RDKitChem::RWMol) }
    let(:error) { StandardError.new('Error message') }

    context 'when RDKit returns a valid molfile' do
      before do
        allow(RDKitChem::RWMol).to receive(:mol_from_smiles).and_return(rw_mol)
        allow(rw_mol).to receive(:mol_to_mol_block).and_return(babel_info[:molfile])
      end

      it 'returns the molfile' do
        expect(fetcher.send(:rdkit_molfile)).to eq(babel_info[:molfile])
      end
    end

    context 'when RDKit raises an error' do
      before do
        allow(RDKitChem::RWMol).to receive(:mol_from_smiles).and_return(rw_mol)
        allow(rw_mol).to receive(:mol_to_mol_block).and_raise(error)
        allow(fetcher).to receive(:handle_rdkit_error).and_return(nil)
      end

      it 'handles the error gracefully' do
        fetcher.send(:rdkit_molfile)
        expect(fetcher).to have_received(:handle_rdkit_error).with(error, rw_mol)
      end
    end
  end

  describe '#pubchem_molfile' do
    let(:pubchem_service) { class_double(Chemotion::PubchemService) }

    before { stub_const('Chemotion::PubchemService', pubchem_service) }

    context 'when PubChem returns a valid molfile' do
      before do
        allow(pubchem_service).to receive(:molfile_from_smiles).and_return(babel_info[:molfile])
        allow(fetcher).to receive(:validate_and_clear_molfile).and_return(babel_info[:molfile])
      end

      it 'returns the validated molfile' do
        expect(fetcher.send(:pubchem_molfile)).to eq(babel_info[:molfile])
      end
    end

    context 'when PubChem raises an error' do
      before do
        allow(pubchem_service).to receive(:molfile_from_smiles).and_raise(StandardError)
        allow(fetcher).to receive(:log_error)
      end

      it 'logs the error and returns nil' do
        expect(fetcher.send(:pubchem_molfile)).to be_nil
        expect(fetcher).to have_received(:log_error)
      end
    end
  end

  describe '#handle_rdkit_error' do
    let(:rw_mol) { instance_double(RDKitChem::RWMol) }
    let(:error) { StandardError.new('RDKit Error') }

    before do
      allow(rw_mol).to receive(:mol_to_mol_block)
      fetcher.send(:handle_rdkit_error, error, rw_mol)
    end

    it 'logs the error and attempts fallback molfile processing' do
      expect(rw_mol).to have_received(:mol_to_mol_block).with(true, -1, false)
    end
  end

  describe '#validate_and_clear_molfile' do
    let(:molfile) { "MOLFILE\nStatus: 200\nEND" }

    context 'when molfile is valid' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:molfile_clear_hydrogens).and_return(molfile)
      end

      it 'validates and clears the molfile' do
        expect(fetcher.send(:validate_and_clear_molfile, molfile)).to eq(molfile)
      end
    end

    context 'when molfile is invalid' do
      let(:invalid_molfile) { "MOLFILE\nStatus: 400\nEND" }

      it 'returns nil' do
        expect(fetcher.send(:validate_and_clear_molfile, invalid_molfile)).to be_nil
      end
    end
  end
end
