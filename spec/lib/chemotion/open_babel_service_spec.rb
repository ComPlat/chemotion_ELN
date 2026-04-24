# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::OpenBabelService do
  describe '.molecule_info_from_structure' do
    let(:conversion) { instance_double(OpenBabel::OBConversion) }
    let(:mol) { instance_double(OpenBabel::OBMol) }
    let(:op) { instance_double(OpenBabel::OBOp) }
    let(:error_log) { object_double(OpenBabel.obErrorLog) }

    before do
      allow(OpenBabel::OBConversion).to receive(:new).and_return(conversion)
      allow(OpenBabel::OBMol).to receive(:new).and_return(mol)
      allow(OpenBabel::OBOp).to receive(:find_type).with('gen2D').and_return(op)
      allow(OpenBabel).to receive(:obErrorLog).and_return(error_log)

      allow(error_log).to receive(:clear_log)
      allow(error_log).to receive(:get_messages_of_level).with(0).and_return([])
      allow(error_log).to receive(:get_messages_of_level).with(1).and_return([])

      allow(conversion).to receive(:set_in_format)
      allow(conversion).to receive(:read_string)
      allow(conversion).to receive(:set_out_format)
      allow(op).to receive(:do)

      allow(described_class).to receive_messages(
        inchi_info: { inchi: 'InChI=1S/test', inchikey: 'TEST-INCHIKEY' },
        svg_from_molfile: '<svg/>',
        fingerprint_from_molfile: 'fp',
      )

      allow(mol).to receive_messages(
        get_total_charge: 0,
        get_mol_wt: 0.0,
        get_exact_mass: 0.0,
        get_title: 'title',
        get_total_spin_multiplicity: 1,
        get_formula: 'H2O',
      )
    end

    it 'extracts canonical smiles from the first line only' do
      allow(conversion).to receive(:write_string).and_return(
        "C1=CC something\n",
        "N#N can-meta\nSECOND-LINE\n",
        "molfile-v2000\n",
      )

      info = described_class.molecule_info_from_structure('N#N', 'smi')

      expect(info[:cano_smiles]).to eq('N#N')
    end

    it 'returns empty canonical smiles when canonical generation raises SystemStackError' do
      call_count = 0
      allow(conversion).to receive(:write_string) do
        call_count += 1
        case call_count
        when 1
          "CC smiles-meta\n"
        when 2
          raise SystemStackError
        else
          "molfile-v2000\n"
        end
      end

      info = described_class.molecule_info_from_structure('CC', 'smi')

      expect(info[:cano_smiles]).to eq('')
    end

    it 'returns empty canonical smiles for multiple_R molfile when can conversion fails' do
      molfile = file_fixture('structures/molfiles/multiple_R.mol').read

      allow(described_class).to receive_messages(
        molfile_version: 'V3000',
        molfile_has_R: false,
        mofile_clear_coord_bonds: nil,
      )

      call_count = 0
      allow(conversion).to receive(:write_string) do
        call_count += 1
        case call_count
        when 1
          "C1=CC smiles-meta\n"
        when 2
          raise StandardError, 'can conversion failed for KU141_index'
        else
          "unexpected-extra-call\n"
        end
      end

      info = described_class.molecule_info_from_molfile(molfile)

      expect(info[:cano_smiles]).to eq('')
    end
  end
end
