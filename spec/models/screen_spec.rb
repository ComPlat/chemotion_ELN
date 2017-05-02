require 'rails_helper'

RSpec.describe Screen, type: :model do
  describe 'creation' do
    let(:screen) { create(:screen) }

    it 'is possible to create a valid screen' do
      expect(screen.valid?).to be(true)
    end
  end

  describe 'after creation' do
    let(:screen) { create(:screen) }

    it 'has a CodeLog' do
      expect(screen.code_log.value).to match(/\d{40}/)
      expect(screen.code_log.id).to match(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      )
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

    it 'only soft deletes screen and associated wellplates' do
      expect(Screen.with_deleted).to eq [screen]
      expect(Wellplate.with_deleted).to eq [wellplate]
    end
  end
end
