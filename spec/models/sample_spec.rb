require 'rails_helper'

RSpec.describe Sample, type: :model do
  
  describe 'creation' do
    let(:sample) { create(:sample) }
    it 'is possible to create a valid sample' do
      expect(sample.valid?).to be(true)
    end
  end



  context 'with molecule' do

    let(:sample) { build(:sample) }
    let(:molecule) {create(:molecule)}

    it 'it should belong to a sample' do
      sample.molecule = molecule
      sample.save

      persisted_sample = Sample.last
      expect(persisted_sample.molecule).to be === (molecule)
    end
  end

end
