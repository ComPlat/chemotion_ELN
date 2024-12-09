# frozen_string_literal: true

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
      expect { invalid_molecule.save! }.to raise_error
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

  describe 'persistance' do
    let(:molecule) { build(:molecule) }

    it 'persists array of names' do
      molecule.names = %w[foo bar quz]
      molecule.save!
      persisted_molecule = described_class.last
      expect(persisted_molecule.names).to match_array(molecule.names)
    end

    it 'persists the binary molfile' do
      molfile_example = "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n" # File.open("spec/models/molecule_spec.rb", "rb")
      molecule.assign_attributes(molfile: molfile_example)
      molecule.save!
      persisted_molecule = described_class.last
      persisted_molfile_SHA =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_SHA =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_SHA).to be === molfile_SHA
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
  describe '.find_or_create_by_inchikey' do
    let(:smiles_bad)  { build(:faulty_smiles, key: '002') }
    let(:smiles_good) { build(:smiles, key: '002') }
    let(:good_info) { Chemotion::OpenBabelService.molecule_info_from_structure(smiles_good, 'smi') }
    let(:bad_info) { Chemotion::OpenBabelService.molecule_info_from_structure(smiles_bad, 'smi') }

    # mock Chemotion::PubchemService.molecule_info_from_inchikey to return empty hash
    before do
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
    end

    it 'has different inchikeys' do

      expect(good_info[:inchikey]).not_to eq(bad_info[:inchikey])
    end

    it 'creates a new bad molecule if it does not exist' do

      expect(described_class.find_by(inchikey: bad_info[:inchikey], is_partial: false))
      molecule = described_class.find_or_create_by_molfile(bad_info[:molfile])
      expect(molecule).to be_persisted
      expect(molecule.inchikey).to eq(bad_info[:inchikey])
    end

    it 'does not create a good molecule after a bad one' do
      molecule = described_class.find_or_create_by_molfile(bad_info[:molfile])
      molecule_good = described_class.find_or_create_by_molfile(good_info[:molfile])
      expect(molecule_good).to be_persisted
      expect(molecule_good.inchikey).to eq(good_info[:inchikey])
    end
    it 'does not transform a bad  smiles into molfile' do

      rw_mol = begin 
                 RDKitChem::RWMol.mol_from_smiles(smiles_bad)
               rescue StandardError => e
                  e.message
               end
      expect(rw_mol).to be_a(String)
      expect(rw_mol).to eq('')
    end
  end
end
