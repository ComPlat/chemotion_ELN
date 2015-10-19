require 'rails_helper'

RSpec.describe Wellplate, type: :model do
  describe 'creation' do
    let(:wellplate) { create(:wellplate) }

    it 'is possible to create a valid screen' do
      expect(wellplate.valid?).to be(true)
    end
  end

  describe 'deletion' do
    let(:screen)     { create(:screen) }
    let(:wellplate)  { create(:wellplate) }
    let(:well)       { create(:well, wellplate: wellplate) }
    let(:collection) { create(:collection) }

    before do
      CollectionsWellplate.create!(wellplate: wellplate, collection: collection)
      ScreensWellplate.create!(wellplate: wellplate, screen: screen)
      wellplate.destroy
    end

    it 'destroys associations properly' do
      expect(collection.collections_wellplates).to eq []
      expect(screen.screens_wellplates).to eq []
      expect(Well.count).to eq 0
    end
  end
end
