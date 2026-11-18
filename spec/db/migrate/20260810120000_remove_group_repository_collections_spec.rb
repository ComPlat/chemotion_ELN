# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20260810120000_remove_group_repository_collections.rb').to_s

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260810120000: RemoveGroupRepositoryCollections' do
  let(:group) { create(:group) }
  let(:person) { create(:person) }
  # User#create_chemotion_public_collection returns early for a Group, so a group's repository
  # collection can only be a legacy row; build it the way the pre-guard code did.
  let!(:group_repository) do
    Collection.create!(user: group, label: 'chemotion-repository.net', position: 1, is_locked: true)
  end

  it "soft-deletes a group account's repository collection" do
    RemoveGroupRepositoryCollections.new.up

    expect(Collection.exists?(group_repository.id)).to be(false)
    expect(Collection.only_deleted.exists?(group_repository.id)).to be(true)
  end

  it "leaves a person's repository collection alone" do
    person_repository = Collection.find_by!(user_id: person.id, label: 'chemotion-repository.net')

    RemoveGroupRepositoryCollections.new.up

    expect(person_repository.reload.deleted_at).to be_nil
  end

  context 'when the group row unexpectedly has children' do
    let!(:child) { create(:collection, user: group, label: 'Kept', parent: group_repository) }

    it 'keeps it rather than putting the subtree out of reach' do
      RemoveGroupRepositoryCollections.new.up

      expect(Collection.exists?(group_repository.id)).to be(true)
      expect(child.reload.parent_id).to eq(group_repository.id)
    end
  end

  context 'when the group row is an ordinary unlocked collection with that label' do
    # A collection archive recreates collections under their original labels and never locks them,
    # so a group can own real user data called "chemotion-repository.net".
    let!(:imported) { create(:collection, user: group, label: 'chemotion-repository.net') }

    it 'is left alone' do
      RemoveGroupRepositoryCollections.new.up

      expect(imported.reload.deleted_at).to be_nil
    end
  end

  context 'when the group row holds elements' do
    let!(:sample) { create(:sample, collections: [group_repository]) }

    it 'keeps it rather than orphaning the elements' do
      RemoveGroupRepositoryCollections.new.up

      expect(Collection.exists?(group_repository.id)).to be(true)
      expect(sample.reload.collections).to include(group_repository)
    end
  end

  it 'refuses to roll back rather than reporting a restore it cannot make' do
    RemoveGroupRepositoryCollections.new.up

    expect { RemoveGroupRepositoryCollections.new.down }.to raise_error(ActiveRecord::IrreversibleMigration)
  end
end
# rubocop:enable RSpec/DescribeClass
