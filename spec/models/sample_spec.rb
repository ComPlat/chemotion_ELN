require 'rails_helper'

RSpec.describe Sample, type: :model do
  
  describe 'creation' do
    let(:sample) { create(:sample) }
    it 'is possible to create a valid sample' do
      expect(sample.valid?).to be(true)
    end
  end



end
