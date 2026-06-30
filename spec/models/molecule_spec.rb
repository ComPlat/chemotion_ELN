# frozen_string_literal: true

# == Schema Information
#
# Table name: molecules
#
#  id                     :integer          not null, primary key
#  boiling_point          :float
#  cano_smiles            :string
#  cas                    :text
#  deleted_at             :datetime
#  density                :float            default(0.0)
#  exact_molecular_weight :float
#  inchikey               :string
#  inchistring            :string
#  is_partial             :boolean          default(FALSE), not null
#  iupac_name             :string
#  melting_point          :float
#  molecular_weight       :float
#  molecule_svg_file      :string
#  molfile                :binary
#  molfile_version        :string(20)
#  names                  :string           default([]), is an Array
#  sum_formular           :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_molecules_on_deleted_at                           (deleted_at)
#  index_molecules_on_formula_and_inchikey_and_is_partial  (inchikey,sum_formular,is_partial) UNIQUE
#
require 'rails_helper'
require 'digest'

RSpec.describe Molecule, type: :model do
  describe 'creation' do
    let(:molecule) { create(:molecule) }

    it 'is possible to create a valid molecule' do
      expect(molecule.valid?).to be(true)
    end

    it 'has a unique inchikey' do
      molecule.save!
      invalid_molecule = described_class.new
      invalid_molecule.inchikey = molecule.inchikey
      invalid_molecule.sum_formular = molecule.sum_formular
      invalid_molecule.is_partial = molecule.is_partial
      expect { invalid_molecule.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'have a tag with CID' do
      molecule.save!
      expect(molecule.tag.taggable_data['pubchem_cid']).to eq('123456789')
    end

    it 'has molecule_names' do
      association_names = molecule.molecule_names.map(&:name)
      database_names    = molecule.names

      expect(association_names).to include molecule.sum_formular
      expect(database_names).to match_array(association_names.without(molecule.sum_formular))
    end
  end

  describe '#delete' do
    let(:molecule) { create(:molecule) }

    it 'deletes the molecule' do
      molecule.delete
      expect(described_class.where(id: molecule.id).count).to eq(0)
    end

    it 'modifies the inchikey' do
      id = molecule.id
      inchikey = molecule.inchikey
      molecule.save!
      molecule.destroy!
      deleted_molecule = described_class.only_deleted.find_by(id: id)
      expect(deleted_molecule&.inchikey).to start_with("#{id}_")
      expect(deleted_molecule&.inchikey).to end_with(inchikey)
    end
  end

  describe 'persistance' do
    let(:molecule) { build(:molecule) }

    it 'persists array of names' do
      molecule.names = %w[foo bar quz]
      molecule.save!
      persisted_molecule = described_class.last
      expect(persisted_molecule.names).to match_array(molecule.names)
    end

    it 'persists the binary molfile' do
      molfile_example = <<~MOL

          Ketcher 05301616272D 1   1.00000     0.00000     0

          2  1  0     0  0            999 V2000
            1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  END
      MOL
      molecule.assign_attributes(molfile: molfile_example)
      molecule.save!
      persisted_molecule = described_class.last
      persisted_molfile_sha =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_sha =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_sha).to eq(molfile_sha)
    end

    it 'updates LCSS when molecule.pubchem_lcss is requested' do
      molecule.save!
      persisted_molecule = described_class.last

      # lcss is updated as nil because cid 123456789 has no PubChem lcss
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).to be_nil

      # lcss is updated with value because cid 643785 has PubChem lcss
      persisted_molecule.tag.taggable_data['pubchem_cid'] = 643_785
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).not_to be_nil
    end
  end

  describe '#assign_molecule_data svg_molfile: kwarg' do
    let(:molecule) { build(:molecule) }
    let(:babel_info) do
      {
        inchi: 'InChI=...', formula: 'C6H6', mol_wt: 78.0, mass: 78.0,
        cano_smiles: 'c1ccccc1', molfile_version: 'V2000', is_partial: false,
        svg: nil, ob_log: nil
      }
    end

    it 'uses svg_molfile for SVG generation when provided' do
      original_molfile = "full-molfile-with-PolymersList\n> <PolymersList>\n0/95/1.0-1.0\n$$$$"
      partial_molfile  = 'partial-molfile-no-PolymersList'
      molecule.molfile = partial_molfile

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, original_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, original_molfile)
    end

    it 'falls back to self.molfile when svg_molfile is not given' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {})
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'falls back to self.molfile when svg_molfile is nil explicitly' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, nil)
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'assigns molecular properties from babel_info regardless of svg_molfile' do
      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.molfile = 'molfile'

      molecule.assign_molecule_data(babel_info, {})

      expect(molecule.sum_formular).to eq('C6H6')
      expect(molecule.molecular_weight).to eq(78.0)
      expect(molecule.exact_molecular_weight).to eq(78.0)
    end
  end

  describe '.find_or_create_by_molfile with polymer (svg_molfile: fix)' do
    let(:polymer_molfile) do
      <<~MOL

          Ketcher  01012012572D 1   1.00000     0.00000     0

          2  1  0  0  0  0            999 V2000
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.2124    0.7000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  RGP  1   2   1
        M  END

        > <PolymersList>
        1/95/1.00-1.00

        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList) to assign_molecule_data as svg_molfile' do
      # Prevent actual OpenBabel / PubChem / SVG calls
      babel_info = {
        inchikey: 'TESTINCHIKEY12345-UHFFFAOYSA-N',
        inchi: 'InChI=1S/test',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(polymer_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, polymer_molfile)
    end
  end

  describe '.find_or_create_by_molfile with ball-only polymer (null header, TextNode)' do
    let(:ball_only_molfile) do
      <<~MOL
        null
          Ketcher  6232611422D 1   1.00000     0.00000     0

          1  0  0  0  0  0  0  0  0  0999 V2000
            2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END

        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList and TextNode) as svg_molfile' do
      babel_info = {
        inchikey: 'BALLONLYINCHIKEY-UHFFFAOYSA-N',
        inchi: 'InChI=1S/ball',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(ball_only_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, ball_only_molfile)
    end
  end
end
