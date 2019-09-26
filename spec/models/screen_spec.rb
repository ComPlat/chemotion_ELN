# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Screen, type: :model do
  let(:collection) { create(:collection) }
  let(:wellplate)  { create(:wellplate) }
  let(:screen) { create(:screen) }
  let(:sc2) do
    create(:screen, collections: [collection], wellplates: [wellplate])
  end

  describe 'creation' do
    it 'is possible to create a valid screen' do
      expect(screen.valid?).to be(true)
    end
  end

  describe 'after creation' do
    it 'has a CodeLog' do
      expect(screen.code_log.value).to match(/\d{40}/)
      expect(screen.code_log.id).to match(
        /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      )
    end
  end

  describe 'deletion' do
    before do
      sc2.destroy
    end

    it 'destroys associations properly' do
      expect(sc2.collections_screens).to eq []
      expect(sc2.screens_wellplates).to eq []
    end

    it 'only soft deletes screen and associated wellplates' do
      expect(sc2.deleted_at).not_to be_nil
      expect(sc2.screens_wellplates.only_deleted).not_to be_empty
      expect(sc2.wellplates.only_deleted).to eq []
      expect(sc2.collections_screens.only_deleted).not_to be_empty
      expect(sc2.collections.only_deleted).to eq []
    end
  end
end
