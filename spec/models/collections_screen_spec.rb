# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_screens
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  screen_id     :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_screens_on_collection_id                (collection_id)
#  index_collections_screens_on_deleted_at                   (deleted_at)
#  index_collections_screens_on_screen_id_and_collection_id  (screen_id,collection_id) UNIQUE
#
require 'rails_helper'

RSpec.describe CollectionsScreen do
  let(:source) { create(:collection) }
  let(:target) { create(:collection) }
  let(:sample) { create(:sample) }
  let(:wellplate) { create(:wellplate, samples: [sample]) }
  let(:screen) { create(:screen, wellplates: [wellplate]) }
  let(:other_screen) { create(:screen) }

  def put_in(collection, screens: [screen])
    screens.each { |s| described_class.create!(collection: collection, screen: s) }
    CollectionsWellplate.create!(collection: collection, wellplate: wellplate)
    CollectionsSample.create!(collection: collection, sample: sample)
  end

  describe 'associations' do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to belong_to(:screen) }
  end

  describe '.remove_in_collection' do
    before do
      put_in(source, screens: [screen, other_screen])
      put_in(target)
      described_class.remove_in_collection([screen.id], [source.id])
    end

    it 'soft-deletes the screen in the given collection only' do
      expect(source.reload.screens).to contain_exactly(other_screen)
      expect(source.collections_screens.only_deleted.map(&:screen_id)).to contain_exactly(screen.id)
      expect(target.reload.screens).to contain_exactly(screen)
    end

    it 'also removes the associated wellplates and their samples' do
      expect(source.wellplates).to be_empty
      expect(source.samples).to be_empty
      expect(target.samples).to contain_exactly(sample)
    end
  end

  describe '.move_to_collection' do
    before do
      put_in(source)
      described_class.move_to_collection([screen.id], [source.id], [target.id])
    end

    it 'removes the screen, its wellplates and their samples from the source' do
      expect(source.reload.screens).to be_empty
      expect(source.wellplates).to be_empty
      expect(source.samples).to be_empty
    end

    it 'adds the screen, its wellplates and their samples to the target' do
      expect(target.reload.screens).to contain_exactly(screen)
      expect(target.wellplates).to contain_exactly(wellplate)
      expect(target.samples).to contain_exactly(sample)
    end
  end

  describe '.create_in_collection' do
    before do
      put_in(source)
      described_class.create_in_collection([screen.id], [target.id])
    end

    it 'adds the screen, its wellplates and their samples to the target' do
      expect(target.reload.screens).to contain_exactly(screen)
      expect(target.wellplates).to contain_exactly(wellplate)
      expect(target.samples).to contain_exactly(sample)
    end

    it 'leaves the source collection untouched' do
      expect(source.reload.screens).to contain_exactly(screen)
    end
  end
end
