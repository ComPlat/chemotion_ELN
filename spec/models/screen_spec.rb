require 'rails_helper'

RSpec.describe Screen, type: :model do
  describe 'creation' do
    let(:screen) { create(:screen) }

    it 'is possible to create a valid screen' do
      expect(screen.valid?).to be(true)
    end
  end

  describe 'deletion' do
    let(:screen)     { create(:screen) }
    let(:wellplate)  { create(:wellplate) }
    let(:collection) { create(:collection) }

    before do
      CollectionsScreen.create!(screen: screen, collection: collection)
      ScreensWellplate.create!(screen: screen, wellplate: wellplate)
      screen.destroy
    end

    it 'destroys associations properly' do
      expect(collection.collections_screens).to eq []
      expect(wellplate.screens_wellplates).to eq []
    end
  end
end
