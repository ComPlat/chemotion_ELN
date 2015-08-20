require 'rails_helper'
require 'digest'

RSpec.describe Molecule, type: :model do
  
  describe 'creation' do
    let(:molecule) { create(:molecule) }
    it 'is possible to create a valid molecule' do
      expect(molecule.valid?).to be(true)
    end

    it 'should have a unique inchikey' do
      molecule.save
      invalid_molecule = Molecule.new
      invalid_molecule.inchikey = molecule.inchikey
      expect {invalid_molecule.save!}.to raise_error
    end
  end

  describe 'persistance' do
    let (:molecule) { build(:molecule) }
    it 'should persist array of names' do
      molecule.names = %w(foo bar quz)
      molecule.save
      persisted_molecule = Molecule.last
      expect(persisted_molecule.names).to match_array(molecule.names)
    end

    it 'should persist the binary molfile' do
      molfile_example = File.open("spec/models/molecule_spec.rb", "rb")
      molecule.molfile = molfile_example.read
      molfile_example.close
      molecule.save
      persisted_molecule = Molecule.last
      persisted_molfile_SHA =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_SHA =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_SHA).to be === (molfile_SHA)
    end
  end
end
