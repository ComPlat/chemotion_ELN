# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::OpenBabelService do
  describe '.get_cdxml_from_molfile' do
    let(:conversion) { instance_double(OpenBabel::OBConversion, convert: true) }
    let(:input_tf) { instance_double(Tempfile, path: '/tmp/input.mol', close!: nil) }
    let(:output_tf) { instance_double(Tempfile, path: '/tmp/output.cdxml', close!: nil) }
    let(:shifter) { instance_double(Cdxml::Shifter, convey: ['<shifted/>', { x_len: 1 }]) }

    before do
      allow(described_class).to receive(:mofile_clear_coord_bonds).and_return(nil)
      allow(Tempfile).to receive(:new).with(['input', '.mol']).and_return(input_tf)
      allow(File).to receive(:write)
      allow(OpenBabel::OBConversion).to receive(:new).and_return(conversion)
      allow(conversion).to receive(:set_in_and_out_formats)
      allow(conversion).to receive(:open_in_and_out_files)
      allow(File).to receive(:read).and_return('<cdxml/>')
      allow(Cdxml::Shifter).to receive(:new).and_return(shifter)
    end

    it 'does not return an already-unlinked tempfile path when no output path is provided' do
      allow(Tempfile).to receive(:new).with(['output', '.mol']).and_return(output_tf)

      result = described_class.get_cdxml_from_molfile('molfile')

      expect(result[:path]).to be_nil
      expect(output_tf).to have_received(:close!)
    end

    it 'returns the caller-provided output path unchanged' do
      output_path = '/tmp/caller-output.cdxml'

      result = described_class.get_cdxml_from_molfile('molfile', {}, output_path)

      expect(result[:path]).to eq(output_path)
    end
  end

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

    it 'returns empty canonical smiles when canonical generation raises SystemStackError',
       :aggregate_failures do
      # The canonical write shares this describe block's sequential write_string counter again
      # now it runs in-process by default, so raise from the writer itself.
      allow(conversion).to receive(:write_string).and_return("CC smiles-meta\n", "molfile-v2000\n")
      allow(described_class).to receive(:canonical_smiles_from).and_return(nil)

      info = described_class.molecule_info_from_structure('CC', 'smi')

      expect(info[:cano_smiles]).to eq('')
      # Molecule#assign_molecule_data persists cano_smiles, so a failed write has to be
      # distinguishable from a structure that canonicalises to nothing.
      timeout = Chemotion::OpenBabelService::CANONICAL_SMILES_TIMEOUT_SECONDS
      expect(info[:ob_log][:warning]).to include("Canonical SMILES generation failed or timed out after #{timeout}s")
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

    it 'appends a timeout warning to ob_log when svg_from_molfile returns nil (SVG render timed out)' do
      allow(described_class).to receive(:svg_from_molfile).and_return(nil)
      allow(conversion).to receive(:write_string).and_return("C smiles-meta\n", "C can-meta\n", "molfile-v2000\n")

      info = described_class.molecule_info_from_molfile('C')

      expect(info[:svg]).to be_nil
      expect(info[:ob_log][:warning]).to include(
        "SVG rendering timed out after #{Chemotion::OpenBabelService::SVG_RENDER_TIMEOUT_SECONDS}s",
      )
    end

    # The SVG render's output is discarded unconditionally on the paths that feed
    # Molecule#assign_molecule_data — svg_reprocess re-renders through Chemotion::SvgRenderer
    # because OpenBabel's SVG always carries the 'Open Babel' marker. render_svg: false is how
    # those callers stop paying for it.
    describe 'render_svg: false' do
      before do
        allow(conversion).to receive(:write_string).and_return("C smiles-meta\n", "C can-meta\n", "molfile-v2000\n")
      end

      it 'does not fork at all' do
        allow(Chemotion::ForkedTimeout).to receive(:run)

        described_class.molecule_info_from_molfile('C', render_svg: false)

        # Both forks on this path go through ForkedTimeout: the SVG render, and the canonical
        # write when bound_native_work is asked for. Neither is, so nothing forks -- which is the
        # contract the request path depends on (see .molecule_info_from_structure).
        expect(Chemotion::ForkedTimeout).not_to have_received(:run)
        expect(described_class).not_to have_received(:svg_from_molfile)
      end

      it 'bounds the canonical write in a fork only when asked to' do
        allow(Chemotion::ForkedTimeout).to receive(:run).and_return('C')

        described_class.molecule_info_from_molfile('C', render_svg: false, bound_native_work: true)

        expect(Chemotion::ForkedTimeout).to have_received(:run)
          .with(Chemotion::OpenBabelService::CANONICAL_SMILES_TIMEOUT_SECONDS)
      end

      it 'returns a nil svg without claiming a timeout', :aggregate_failures do
        info = described_class.molecule_info_from_molfile('C', render_svg: false)

        expect(info[:svg]).to be_nil
        # A skipped render also leaves svg nil; reporting that as a timeout would put a false
        # warning in every importer's ob_log.
        expect(info[:ob_log][:warning].to_a.join).not_to include('SVG rendering timed out')
      end

      it 'leaves every other field intact', :aggregate_failures do
        # The sequential stub in the outer `before` is one-shot, and this example calls the method
        # twice. Reset the position between the two so the second invocation sees the same inputs
        # as the first — otherwise the diff shows a difference in :smiles that has nothing to do
        # with render_svg.
        values = ["C smiles-meta\n", "C can-meta\n"]
        call = 0
        allow(conversion).to receive(:write_string) do
          value = values[call] || values.last
          call += 1
          value
        end

        with_svg = described_class.molecule_info_from_molfile('C')
        call = 0
        without = described_class.molecule_info_from_molfile('C', render_svg: false)

        expect(without.except(:svg, :ob_log)).to eq(with_svg.except(:svg, :ob_log))
        expect(without[:inchikey]).to eq(with_svg[:inchikey])
      end

      it 'still renders by default, so untraced callers are unaffected' do
        allow(described_class).to receive(:svg_from_molfile).and_return('<svg/>')

        expect(described_class.molecule_info_from_molfile('C')[:svg]).to eq('<svg/>')
      end
    end
  end

  describe '.svg_from_molfile' do
    it 'delegates to svg_from_molfile_unsafe inside a ForkedTimeout and returns its value' do
      allow(Chemotion::ForkedTimeout).to receive(:run).with(described_class::SVG_RENDER_TIMEOUT_SECONDS).and_yield
      allow(described_class).to receive(:svg_from_molfile_unsafe).with('molfile', {}).and_return('<svg/>')

      expect(described_class.svg_from_molfile('molfile')).to eq('<svg/>')
    end

    it 'returns nil (does not raise) when the underlying call times out' do
      allow(Chemotion::ForkedTimeout).to receive(:run)
        .and_raise(Chemotion::ForkedTimeout::TimedOut, 'block exceeded 20s')

      expect(described_class.svg_from_molfile('molfile')).to be_nil
    end
  end

  describe '.molecule_info_from_molfiles' do
    it 'returns nil for a record that raises, without reusing a previous record\'s result' do
      allow(described_class).to receive(:molecule_info_from_molfile) do |molfile|
        case molfile
        when 'first' then { inchikey: 'FIRST-KEY' }
        when 'second' then raise StandardError, 'boom'
        when 'third' then { inchikey: 'THIRD-KEY' }
        end
      end

      result = described_class.molecule_info_from_molfiles(%w[first second third])

      expect(result).to eq([{ inchikey: 'FIRST-KEY' }, nil, { inchikey: 'THIRD-KEY' }])
    end

    it 'returns nil when the very first record raises' do
      allow(described_class).to receive(:molecule_info_from_molfile).and_raise(StandardError, 'boom')

      result = described_class.molecule_info_from_molfiles(%w[only])

      expect(result).to eq([nil])
    end

    # The batch entry point is what the SDF importer uses, so both flags have to reach every
    # record or the saving only applies to callers that go one at a time.
    it 'forwards render_svg to every record', :aggregate_failures do
      allow(described_class).to receive(:molecule_info_from_molfile).and_return({})

      described_class.molecule_info_from_molfiles(%w[a b], render_svg: false)

      expect(described_class).to have_received(:molecule_info_from_molfile)
        .with('a', render_svg: false, bound_native_work: false)
      expect(described_class).to have_received(:molecule_info_from_molfile)
        .with('b', render_svg: false, bound_native_work: false)
    end

    it 'forwards bound_native_work to every record', :aggregate_failures do
      allow(described_class).to receive(:molecule_info_from_molfile).and_return({})

      described_class.molecule_info_from_molfiles(%w[a b], render_svg: false, bound_native_work: true)

      expect(described_class).to have_received(:molecule_info_from_molfile)
        .with('a', render_svg: false, bound_native_work: true)
      expect(described_class).to have_received(:molecule_info_from_molfile)
        .with('b', render_svg: false, bound_native_work: true)
    end

    it 'renders, and does not bound, by default' do
      allow(described_class).to receive(:molecule_info_from_molfile).and_return({})

      described_class.molecule_info_from_molfiles(%w[a])

      expect(described_class).to have_received(:molecule_info_from_molfile)
        .with('a', render_svg: true, bound_native_work: false)
    end
  end

  describe 'V3000 InChIKey parity' do
    # Benzene in V2000 format
    let(:benzene_v2000) do
      <<~MOL
        benzene
          Ketcher 11202611232D

          6  6  0     0  0            999 V2000
            1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.3350   -0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000   -1.5400    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -1.3350   -0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000    1.5400    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
          2  3  2  0     0  0
          3  4  1  0     0  0
          4  5  2  0     0  0
          5  6  1  0     0  0
          6  1  2  0     0  0
        M  END
      MOL
    end

    # Same benzene in V3000 format
    let(:benzene_v3000) do
      <<~MOL
        benzene
          Ketcher 11202611232D

          0  0  0     0  0            999 V3000
        M  V30 BEGIN CTAB
        M  V30 COUNTS 6 6 0 0 0
        M  V30 BEGIN ATOM
        M  V30 1 C 1.3350 0.7700 0.0000 0
        M  V30 2 C 1.3350 -0.7700 0.0000 0
        M  V30 3 C 0.0000 -1.5400 0.0000 0
        M  V30 4 C -1.3350 -0.7700 0.0000 0
        M  V30 5 C -1.3350 0.7700 0.0000 0
        M  V30 6 C 0.0000 1.5400 0.0000 0
        M  V30 END ATOM
        M  V30 BEGIN BOND
        M  V30 1 1 1 2
        M  V30 2 2 2 3
        M  V30 3 1 3 4
        M  V30 4 2 4 5
        M  V30 5 1 5 6
        M  V30 6 2 6 1
        M  V30 END BOND
        M  V30 END CTAB
        M  END
      MOL
    end

    # Aspirin in V2000 — a real multi-ring structure
    let(:aspirin_v2000) do
      <<~MOL
        aspirin
          Ketcher 11202611232D

         13 13  0     0  0            999 V2000
            1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.3350   -0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000   -1.5400    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -1.3350   -0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000    1.5400    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -2.6700    1.5400    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
           -2.6700    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -4.0050    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
           -4.0050    1.5400    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
            2.6700   -1.5400    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            2.6700   -3.0800    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
            4.0050   -0.7700    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
          2  3  2  0     0  0
          3  4  1  0     0  0
          4  5  2  0     0  0
          5  6  1  0     0  0
          6  1  2  0     0  0
          5  7  1  0     0  0
          7  8  1  0     0  0
          8  9  1  0     0  0
          9 10  2  0     0  0
          2 11  1  0     0  0
         11 12  2  0     0  0
         11 13  1  0     0  0
        M  END
      MOL
    end

    # Same aspirin in V3000
    let(:aspirin_v3000) do
      <<~MOL
        aspirin
          Ketcher 11202611232D

          0  0  0     0  0            999 V3000
        M  V30 BEGIN CTAB
        M  V30 COUNTS 13 13 0 0 0
        M  V30 BEGIN ATOM
        M  V30 1 C 1.3350 0.7700 0.0000 0
        M  V30 2 C 1.3350 -0.7700 0.0000 0
        M  V30 3 C 0.0000 -1.5400 0.0000 0
        M  V30 4 C -1.3350 -0.7700 0.0000 0
        M  V30 5 C -1.3350 0.7700 0.0000 0
        M  V30 6 C 0.0000 1.5400 0.0000 0
        M  V30 7 O -2.6700 1.5400 0.0000 0
        M  V30 8 C -2.6700 0.0000 0.0000 0
        M  V30 9 C -4.0050 0.0000 0.0000 0
        M  V30 10 O -4.0050 1.5400 0.0000 0
        M  V30 11 C 2.6700 -1.5400 0.0000 0
        M  V30 12 O 2.6700 -3.0800 0.0000 0
        M  V30 13 O 4.0050 -0.7700 0.0000 0
        M  V30 END ATOM
        M  V30 BEGIN BOND
        M  V30 1 1 1 2
        M  V30 2 2 2 3
        M  V30 3 1 3 4
        M  V30 4 2 4 5
        M  V30 5 1 5 6
        M  V30 6 2 6 1
        M  V30 7 1 5 7
        M  V30 8 1 7 8
        M  V30 9 1 8 9
        M  V30 10 2 9 10
        M  V30 11 1 2 11
        M  V30 12 2 11 12
        M  V30 13 1 11 13
        M  V30 END BOND
        M  V30 END CTAB
        M  END
      MOL
    end

    it 'produces the same InChIKey for benzene V2000 and V3000' do
      key_v2000 = described_class.inchikey_from_molfile(benzene_v2000)
      key_v3000 = described_class.inchikey_from_molfile(benzene_v3000)

      expect(key_v2000).to be_present
      expect(key_v3000).to be_present
      expect(key_v3000).to eq(key_v2000)
    end

    it 'produces the same InChIKey for aspirin V2000 and V3000' do
      key_v2000 = described_class.inchikey_from_molfile(aspirin_v2000)
      key_v3000 = described_class.inchikey_from_molfile(aspirin_v3000)

      expect(key_v2000).to be_present
      expect(key_v3000).to be_present
      expect(key_v3000).to eq(key_v2000)
    end

    it 'produces a present InChIKey for a real V3000 fixture (naphthalene)' do
      v3000_molfile = file_fixture('mof_v3000_1.mol').read
      key = described_class.inchikey_from_molfile(v3000_molfile)
      expect(key).to be_present
      expect(key).to match(/\A[A-Z]{14}-[A-Z]{10}-[A-Z]\z/)
    end

    it 'molecule_info_from_molfile returns matching formula and inchikey for V3000 benzene' do
      info_v2000 = described_class.molecule_info_from_molfile(benzene_v2000, render_svg: false)
      info_v3000 = described_class.molecule_info_from_molfile(benzene_v3000, render_svg: false)

      expect(info_v3000[:inchikey]).to eq(info_v2000[:inchikey])
      expect(info_v3000[:formula]).to eq(info_v2000[:formula])
      expect(info_v3000[:molfile_version]).to start_with('V3000')
    end
  end

  describe '.molfile_strip_collection_blocks' do
    let(:v3000_with_collection) do
      <<~MOL
        Enhanced stereochemistry example
          Codex             2D
        ABS OR AND
          0  0  0     0  0            999 V3000
        M  V30 BEGIN CTAB
        M  V30 COUNTS 6 5 0 0 1
        M  V30 BEGIN ATOM
        M  V30 1 C 0 0 0 0
        M  V30 2 C 1.3 0.75 0 0
        M  V30 3 C 2.6 0 0 0
        M  V30 4 O 1.3 2.25 0 0
        M  V30 5 O 2.6 -1.5 0 0
        M  V30 6 F 3.9 0.75 0 0
        M  V30 END ATOM
        M  V30 BEGIN BOND
        M  V30 1 1 1 2
        M  V30 2 1 2 3
        M  V30 3 1 2 4 CFG=1
        M  V30 4 1 3 5 CFG=1
        M  V30 5 1 3 6 CFG=3
        M  V30 END BOND
        M  V30 BEGIN COLLECTION
        M  V30 MDLV30/STEABS ATOMS=(1 2)
        M  V30 MDLV30/STEREL1 ATOMS=(2 3 4)
        M  V30 MDLV30/STERAC1 ATOMS=(2 5 6)
        M  V30 END COLLECTION
        M  V30 END CTAB
        M  END
      MOL
    end

    let(:v3000_without_collection) do
      <<~MOL
        Benzene
          Codex             2D

          0  0  0     0  0            999 V3000
        M  V30 BEGIN CTAB
        M  V30 COUNTS 6 6 0 0 0
        M  V30 BEGIN ATOM
        M  V30 1 C 0 0 0 0
        M  V30 2 C 1.3 0.75 0 0
        M  V30 3 C 2.6 0 0 0
        M  V30 4 C 3.9 0.75 0 0
        M  V30 5 C 5.2 0 0 0
        M  V30 6 C 6.5 0.75 0 0
        M  V30 END ATOM
        M  V30 BEGIN BOND
        M  V30 1 2 1 2
        M  V30 2 1 2 3
        M  V30 3 2 3 4
        M  V30 4 1 4 5
        M  V30 5 2 5 6
        M  V30 6 1 6 1
        M  V30 END BOND
        M  V30 END CTAB
        M  END
      MOL
    end

    it 'returns nil when no COLLECTION block is present' do
      result = described_class.send(:molfile_strip_collection_blocks, v3000_without_collection)
      expect(result).to be_nil
    end

    it 'removes the BEGIN COLLECTION … END COLLECTION section' do
      result = described_class.send(:molfile_strip_collection_blocks, v3000_with_collection)
      expect(result).not_to include('BEGIN COLLECTION')
      expect(result).not_to include('END COLLECTION')
      expect(result).not_to include('MDLV30/STEABS')
      expect(result).not_to include('MDLV30/STEREL1')
      expect(result).not_to include('MDLV30/STERAC1')
    end

    it 'preserves the atom and bond blocks after stripping' do
      result = described_class.send(:molfile_strip_collection_blocks, v3000_with_collection)
      expect(result).to include('BEGIN ATOM')
      expect(result).to include('END ATOM')
      expect(result).to include('BEGIN BOND')
      expect(result).to include('END BOND')
      expect(result).to include('M  END')
    end

    it 'molecule_info_from_molfile processes V3000 with COLLECTION blocks without error' do
      info = described_class.molecule_info_from_molfile(v3000_with_collection, render_svg: false)
      expect(info[:inchikey]).to be_present
      expect(info[:molfile_version]).to start_with('V3000')
    end
  end
end
