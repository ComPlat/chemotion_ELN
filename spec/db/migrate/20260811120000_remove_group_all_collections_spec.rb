# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20260811120000_remove_group_all_collections.rb').to_s

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20260811120000: RemoveGroupAllCollections' do
  let(:group) { create(:group) }
  let(:person) { create(:person) }
  # User#create_all_collection is Person-only now, so a group's "All" can only be a legacy row;
  # build it the way the pre-guard code did.
  let!(:group_all) do
    Collection.create!(user: group, label: 'All', position: 0, is_locked: true)
  end

  it "soft-deletes a group account's empty All collection" do
    RemoveGroupAllCollections.new.up

    expect(Collection.exists?(group_all.id)).to be(false)
    expect(Collection.only_deleted.exists?(group_all.id)).to be(true)
  end

  it "leaves a person's All collection alone" do
    person_all = Collection.get_all_collection_for_user(person.id)

    RemoveGroupAllCollections.new.up

    expect(person_all.reload.deleted_at).to be_nil
  end

  context 'when the group row holds elements' do
    let!(:sample) { create(:sample, collections: [group_all]) }

    it 'keeps it rather than orphaning them' do
      RemoveGroupAllCollections.new.up

      expect(Collection.exists?(group_all.id)).to be(true)
      expect(sample.reload.collections).to include(group_all)
    end
  end

  context 'when the group row has a child collection' do
    let!(:child) { create(:collection, user: group, label: 'Kept', parent: group_all) }

    it 'keeps it rather than putting the subtree out of reach' do
      RemoveGroupAllCollections.new.up

      expect(Collection.exists?(group_all.id)).to be(true)
      expect(child.reload.parent_id).to eq(group_all.id)
    end
  end

  it 'refuses to roll back rather than reporting a restore it cannot make' do
    RemoveGroupAllCollections.new.up

    expect { RemoveGroupAllCollections.new.down }.to raise_error(ActiveRecord::IrreversibleMigration)
  end
end
# rubocop:enable RSpec/DescribeClass
