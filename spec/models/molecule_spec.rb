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
      molecule.molfile = 
        (Digest::SHA256.new << "Example Binary Molefile Content").hexdigest
      molecule.save
      persisted_molecule = Molecule.last
      expect(persisted_molecule.molfile).to be === (molecule.molfile)
    end
  end

  

  # concern "with sample"
    # it should belong to a sample
end
