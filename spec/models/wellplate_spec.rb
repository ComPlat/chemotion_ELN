require 'rails_helper'

RSpec.describe Wellplate, type: :model do
  describe 'creation' do
    let(:wellplate) { create(:wellplate) }

    it 'is possible to create a valid screen' do
      expect(wellplate.valid?).to be(true)
    end
  end

  describe 'after creation' do
    let(:wellplate) { create(:wellplate) }

    it 'has a bar and qr code' do
      expect(wellplate.bar_code).to be_a(String)
      expect(wellplate.qr_code).to be_a(String)
    end
  end

  describe 'deletion' do
    let(:screen)     { create(:screen) }
    let(:wellplate)  { create(:wellplate) }
    let(:sample)     { create(:sample) }
    let(:well)       { create(:well, sample: sample, wellplate: wellplate) }
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

    it 'only soft deletes wellplate and associated sample' do
      expect(Wellplate.with_deleted).to eq [wellplate]
      expect(Sample.with_deleted).to eq [sample]
    end
  end
end
