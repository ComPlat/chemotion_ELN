# frozen_string_literal: true

require 'rails_helper'

# Real (non-mocked) characterization tests that exercise the *actual* OpenBabel
# native extension. The sibling spec `open_babel_service_spec.rb` mocks OpenBabel
# entirely, so it cannot detect a behavioral change across an OpenBabel version
# bump. This spec is the bump-verification harness for OpenBabel 2.4 -> 3.1.1.
#
# Assertion strategy: stable invariants + tolerances.
#   * Exact for formula / charge / InChI(Key) / substructure / molfile version.
#     (InChI/InChIKey are produced by the separate `inchi` gem, so they are stable
#     across the OpenBabel bump.)
#   * Numeric tolerance for molecular weight / exact mass (atomic-weight tables may
#     differ slightly between OB major versions).
#   * Contract checks (non-empty, length, valid <svg> root, formula-preserving
#     round-trip) for fields that legitimately vary between OB major versions:
#     canonical SMILES strings, SVG markup, and FP2 fingerprint bits.
RSpec.describe Chemotion::OpenBabelService do
  let(:water_mol)  { file_fixture('structures/molfiles/WATER.mol').read }
  let(:cubane_mol) { file_fixture('structures/molfiles/cubane.mol').read }
  let(:v2000_mol)  { file_fixture('mof_v2000_1.mol').read }
  let(:v3000_mol)  { file_fixture('mof_v3000_1.mol').read }

  # CCDC record EKOWOR (a 193-atom/648-bond uranium complex, extracted from a real
  # organometallic SDF dump): confirmed to make OpenBabel's native SVG writer hang
  # indefinitely (>90s, no return) prior to the ForkedTimeout fix.
  let(:ekowor_uranium_mol) { file_fixture('structures/molfiles/ekowor_uranium.mol').read }

  # 3 atoms (C-N-O), bond 2-3 is a type-9 (coordinate) bond.
  let(:v2000_coord_mol) do
    <<~MOL
      coordtest

        crafted
        3  2  0  0  0  0  0  0  0  0999 V2000
          0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
          2.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
        1  2  1  0  0  0  0
        2  3  9  0  0  0  0
      M  END
    MOL
  end

  # V3000 equivalent: bond 2 is a type-9 (coordinate) bond.
  let(:v3000_coord_mol) do
    <<~MOL
      coordtest

        crafted
        0  0  0  0  0  0  0  0  0  0999 V3000
      M  V30 BEGIN CTAB
      M  V30 COUNTS 3 2 0 0 0
      M  V30 BEGIN ATOM
      M  V30 1 C 0 0 0 0
      M  V30 2 N 1 0 0 0
      M  V30 3 O 2 0 0 0
      M  V30 END ATOM
      M  V30 BEGIN BOND
      M  V30 1 1 1 2
      M  V30 2 9 2 3
      M  V30 END BOND
      M  V30 END CTAB
      M  END
    MOL
  end

  # Methane with 4 explicit hydrogens (5 atoms, 4 bonds).
  let(:methane_explicit_h_mol) do
    <<~MOL
      methane

        crafted
        5  4  0  0  0  0  0  0  0  0999 V2000
          0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          0.6300    0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
         -0.6300   -0.6300    0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
         -0.6300    0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
          0.6300   -0.6300   -0.6300 H   0  0  0  0  0  0  0  0  0  0  0  0
        1  2  1  0  0  0  0
        1  3  1  0  0  0  0
        1  4  1  0  0  0  0
        1  5  1  0  0  0  0
      M  END
    MOL
  end

  # V2000 molfile with one R# (residue) atom at element column 32.
  let(:r_group_mol) do
    <<~MOL
      rgrouptest

        crafted
        2  1  0  0  0  0  0  0  0  0999 V2000
          0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1.0000    0.0000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
        1  2  1  0  0  0  0
      M  RGP  1   2   1
      M  END
    MOL
  end

  # canonical SMILES write appends the molecule title; take the structure token only.
  def smiles_token(str)
    str.to_s.split(/\s/).first.to_s
  end

  # round a SMILES/structure back to its molecular formula via OpenBabel.
  def formula_of(structure, format)
    described_class.molecule_info_from_structure(structure, format)[:formula]
  end

  describe '.molecule_info_from_molfile' do
    subject(:info) { described_class.molecule_info_from_molfile(water_mol) }

    it 'reports the correct formula and neutral charge' do
      expect(info[:formula]).to eq('H2O')
      expect(info[:charge]).to eq(0)
    end

    it 'reports molecular weight and exact mass within tolerance' do
      expect(info[:mol_wt]).to be_within(0.05).of(18.015)
      expect(info[:mass]).to be_within(0.05).of(18.011)
    end

    it 'computes the canonical InChIKey for water' do
      expect(info[:inchikey]).to eq('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    end

    it 'produces a non-empty SMILES that re-parses to the same formula' do
      expect(info[:smiles]).to be_present
      expect(formula_of(info[:smiles], 'smi')).to eq('H2O')
    end

    it 'renders an SVG and a 16-element fingerprint' do
      expect(info[:svg]).to match(/<svg/)
      expect(info[:fp]).to be_an(Array)
      expect(info[:fp].length).to eq(16)
    end

    it 'detects the molfile version and that the molecule is complete' do
      expect(info[:molfile_version]).to eq('V2000')
      expect(info[:is_partial]).to be(false)
    end
  end

  describe 'hang protection on pathological organometallic input' do
    around do |example|
      # Outer safety net for the *test suite itself*: if the fork-based mechanism ever
      # regresses back to an in-process hang, fail this example in 30s instead of hanging
      # CI for the real SVG_RENDER_TIMEOUT_SECONDS default (or worse). This is not a claim
      # that Timeout.timeout is what fixes the underlying bug -- see forked_timeout_spec.rb
      # and open_babel_service_spec.rb for that; this is just a CI-safety belt-and-suspenders.
      # 30s (not 10s): even with SVG rendering stubbed to a 2s deadline below, the *other*
      # still-unbounded steps for this reproducer (OpenBabel's own internal canonical-labeling
      # time-box, dual InChI attempts, fingerprinting) legitimately take ~10-12s each on their
      # own for this pathological molfile.
      Timeout.timeout(30) { example.run }
    end

    before { stub_const('Chemotion::OpenBabelService::SVG_RENDER_TIMEOUT_SECONDS', 2) }

    it '.svg_from_molfile returns nil instead of hanging on the EKOWOR reproducer' do
      expect(described_class.svg_from_molfile(ekowor_uranium_mol)).to be_nil
    end

    it '.molecule_info_from_molfile completes with a nil svg and a timeout warning in ob_log' do
      info = described_class.molecule_info_from_molfile(ekowor_uranium_mol)

      expect(info[:svg]).to be_nil
      expect(info[:ob_log][:warning]).to include(a_string_matching(/SVG rendering timed out/))
      # everything else in the pipeline still completes for this reproducer
      expect(info[:formula]).to be_present
    end
  end

  describe '.molecule_info_from_structure (from SMILES)' do
    it 'derives benzene properties from a SMILES string' do
      info = described_class.molecule_info_from_structure('c1ccccc1', 'smi')

      expect(info[:formula]).to eq('C6H6')
      expect(info[:charge]).to eq(0)
      expect(info[:mol_wt]).to be_within(0.05).of(78.112)
      expect(info[:inchikey]).to eq('UHOVQNZJYSORNB-UHFFFAOYSA-N')
      expect(info[:molfile_version]).to eq('V2000')
      expect(info[:molfile]).to match(/V2000/)
    end

    it 'derives ethanol properties from a SMILES string' do
      info = described_class.molecule_info_from_structure('CCO', 'smi')

      expect(info[:formula]).to eq('C2H6O')
      expect(info[:mol_wt]).to be_within(0.05).of(46.069)
      expect(info[:inchikey]).to eq('LFQSCWFLJHTTHZ-UHFFFAOYSA-N')
    end

    it 'flags an R-group molfile as partial' do
      info = described_class.molecule_info_from_molfile(r_group_mol)

      expect(info[:is_partial]).to be(true)
      expect(info[:formula]).to be_present
    end
  end

  describe '.molecule_info_from_molfiles' do
    it 'returns one info hash per input molfile' do
      results = described_class.molecule_info_from_molfiles([water_mol, cubane_mol])

      expect(results.length).to eq(2)
      expect(results[0][:formula]).to eq('H2O')
      expect(results[1][:formula]).to eq('C8H8')
    end
  end

  describe 'InChI helpers' do
    it '.inchi_info returns the InChI and InChIKey for water' do
      result = described_class.inchi_info(water_mol)

      expect(result[:inchi]).to eq('InChI=1S/H2O/h1H2')
      expect(result[:inchikey]).to eq('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    end

    it '.inchikey_from_molfile returns the water InChIKey' do
      expect(described_class.inchikey_from_molfile(water_mol)).to eq('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    end

    it '.smiles_to_inchikey returns the benzene InChIKey' do
      expect(described_class.smiles_to_inchikey('c1ccccc1')).to eq('UHOVQNZJYSORNB-UHFFFAOYSA-N')
    end
  end

  describe 'fingerprints' do
    it '.fingerprint_from_molfile returns 16 integers' do
      fp = described_class.fingerprint_from_molfile(cubane_mol)

      expect(fp.length).to eq(16)
      expect(fp).to all(be_an(Integer))
    end

    it 'is deterministic for the same molfile' do
      expect(described_class.fingerprint_from_molfile(cubane_mol))
        .to eq(described_class.fingerprint_from_molfile(cubane_mol))
    end

    it 'differs between distinct molecules' do
      expect(described_class.fingerprint_from_molfile(cubane_mol))
        .not_to eq(described_class.fingerprint_from_molfile(water_mol))
    end

    it '.bin_fingerprint_from_molfile returns 16 64-bit strings' do
      bin = described_class.bin_fingerprint_from_molfile(cubane_mol)

      expect(bin.length).to eq(16)
      expect(bin).to all(match(/\A[01]{64}\z/))
    end
  end

  describe '.substructure_match' do
    let(:benzene_mol) { described_class.smiles_to_molfile('c1ccccc1') }

    it 'matches an aromatic ring query against benzene' do
      expect(described_class.substructure_match('c1ccccc1', benzene_mol)).to be(true)
    end

    it 'does not match an aromatic ring query against cubane' do
      expect(described_class.substructure_match('c1ccccc1', cubane_mol)).to be(false)
    end
  end

  describe 'SMILES / molfile conversions' do
    it '.smiles_to_molfile produces a parseable molfile' do
      molfile = described_class.smiles_to_molfile('CCO')

      expect(molfile).to match(/V2000/)
      expect(described_class.molecule_info_from_molfile(molfile)[:formula]).to eq('C2H6O')
    end

    it '.molfile_from_cano_smiles produces a molfile for the structure' do
      molfile = described_class.molfile_from_cano_smiles('CCO')

      expect(molfile).to match(/V2000/)
      expect(described_class.molfile_version(molfile)).to eq('V2000')
    end

    it '.add_molfile_coordinate generates non-zero 2D coordinates' do
      flat = described_class.smiles_to_molfile('CCO')
      coord = described_class.add_molfile_coordinate(flat)

      atom_lines = coord.lines[4..6]
      expect(atom_lines.any? { |line| line =~ /[1-9]\.\d/ }).to be(true)
    end

    it '.smiles_to_canon_smiles round-trips ethanol to the same formula' do
      canon = described_class.smiles_to_canon_smiles('OCC')

      expect(canon).to be_present
      expect(formula_of(canon, 'smi')).to eq('C2H6O')
    end

    it '.canon_smiles_to_smiles round-trips ethanol to the same formula' do
      smiles = described_class.canon_smiles_to_smiles('CCO')

      expect(smiles).to be_present
      expect(formula_of(smiles, 'smi')).to eq('C2H6O')
    end

    it '.get_smiles_from_molfile returns the structure token for water' do
      expect(smiles_token(described_class.get_smiles_from_molfile(water_mol))).to eq('O')
    end
  end

  describe '.molfile_clear_hydrogens' do
    it 'removes explicit hydrogen atoms' do
      cleared = described_class.molfile_clear_hydrogens(methane_explicit_h_mol)

      expect(methane_explicit_h_mol.lines[3]).to match(/^  5  4/)
      expect(cleared.lines[3]).to match(/^  1  0/)
    end
  end

  describe '.mofile_clear_coord_bonds' do
    it 'removes a type-9 bond from a V2000 molfile and decrements the bond count' do
      result = described_class.mofile_clear_coord_bonds(v2000_coord_mol)

      expect(result).to be_truthy
      expect(result.lines[3]).to match(/^  3  1/)
      expect(result.lines.any? { |line| line =~ /^  \d  \d  9/ }).to be(false)
    end

    it 'removes a type-9 bond from a V3000 molfile and decrements the COUNTS line' do
      result = described_class.mofile_clear_coord_bonds(v3000_coord_mol)

      expect(result).to be_truthy
      expect(result).to match(/M  V30 COUNTS 3 1/)
      expect(result).not_to match(/^M  V30 \d+ 9 /)
    end

    it 'returns false when there are no coordinate bonds' do
      expect(described_class.mofile_clear_coord_bonds(water_mol)).to be(false)
    end
  end

  describe 'molfile structure helpers' do
    it '.molfile_version detects V2000 and V3000' do
      expect(described_class.molfile_version(v2000_mol)).to eq('V2000')
      expect(described_class.molfile_version(v3000_mol)).to eq('V3000')
      expect(described_class.molfile_version(nil)).to eq('nil')
    end

    it '.molfile_has_R detects an R-group atom' do
      expect(described_class.molfile_has_R(r_group_mol)).to be(true)
      expect(described_class.molfile_has_R(water_mol)).to be(false)
    end

    it '.molfile_skip_R replaces the R# residue with carbon' do
      skipped = described_class.molfile_skip_R(r_group_mol)

      expect(skipped).not_to include('R#')
      expect(skipped.lines[5]).to match(/0\.0000 C /)
    end
  end

  describe 'SVG renderers' do
    it '.smi_to_svg renders a valid SVG that includes the white background rect' do
      svg = described_class.smi_to_svg('c1ccccc1')

      expect(svg).to match(/<svg/)
      expect(svg).to include('<rect x="0" y="0" width="100" height="100" fill="white"/>')
    end

    it '.smi_to_trans_svg strips the white background rect' do
      plain = described_class.smi_to_svg('c1ccccc1')
      trans = described_class.smi_to_trans_svg('c1ccccc1')

      expect(trans).to match(/<svg/)
      expect(trans.length).to be <= plain.length
      expect(trans).not_to include('<rect x="0" y="0" width="100" height="100" fill="white"/>')
    end

    it '.mdl_to_svg renders a valid SVG from a molfile' do
      expect(described_class.mdl_to_svg(water_mol)).to match(/<svg/)
    end

    it '.mdl_to_trans_svg strips the white background rect' do
      trans = described_class.mdl_to_trans_svg(water_mol)

      expect(trans).to match(/<svg/)
      expect(trans).not_to include('<rect x="0" y="0" width="100" height="100" fill="white"/>')
    end
  end
end
