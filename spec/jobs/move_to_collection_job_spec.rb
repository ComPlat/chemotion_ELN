# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MoveToCollectionJob do
  let(:user) { create(:person) }
  # GatePushButton is rendered with the repository collection's id (CollectionTree.js), so the id
  # this job receives is always the user's locked "chemotion-repository.net" root - the same shape
  # the lock migration and LockedCollectionGuard both key on.
  let(:source_collection) do
    Collection.find_by!(user_id: user.id, label: 'chemotion-repository.net', is_locked: true)
  end

  describe '#perform' do
    it 'creates the "transferred" collection locked, under the locked repository root' do
      described_class.new.perform(source_collection.id)

      transferred = source_collection.children.find_by(label: 'transferred')
      expect(transferred).to have_attributes(is_locked: true, user_id: user.id)
    end

    it 'reuses an existing "transferred" collection instead of creating a second one' do
      described_class.new.perform(source_collection.id)
      described_class.new.perform(source_collection.id)

      expect(source_collection.children.where(label: 'transferred').count).to eq(1)
    end
  end
end
