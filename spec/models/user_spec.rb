require 'rails_helper'

RSpec.describe 'User', type: :model do
  describe 'creation' do
    let(:user) { create(:user) }

    it 'is possible to create a valid user' do
      expect(user.valid?).to eq true
    end

    it 'creates an All & chemotion.net collection' do
      expect(user.collections.pluck(:label)).to match_array ['All', 'chemotion.net']
    end

  
  end
end
