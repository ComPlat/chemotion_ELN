# frozen_string_literal: true

# == Schema Information
#
# Table name: collections
#
#  id           :integer          not null, primary key
#  ancestry     :string           default("/"), not null
#  deleted_at   :datetime
#  is_locked    :boolean          default(FALSE)
#  label        :text             not null
#  position     :integer
#  shared       :boolean          default(FALSE), not null
#  tabs_segment :jsonb
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  inventory_id :bigint
#  user_id      :integer          not null
#
# Indexes
#
#  index_collections_on_ancestry      (ancestry) WHERE (deleted_at IS NULL)
#  index_collections_on_deleted_at    (deleted_at)
#  index_collections_on_inventory_id  (inventory_id)
#  index_collections_on_user_id       (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (inventory_id => inventories.id)
#
require 'rails_helper'

RSpec.describe Collection do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to belong_to(:user).optional(true) }
  it { is_expected.to have_many(:collections_vessels).dependent(:destroy) }
  it { is_expected.to have_many(:vessels).through(:collections_vessels) }

  describe 'creation' do
    let(:collection) { create(:collection) }

    it 'is possible to create a valid collection' do
      expect(collection.valid?).to be(true)
    end
  end

  describe 'destroying a collection with associated sample' do
    let(:collection) { create(:collection) }
    let(:sample)     { create(:sample) }

    before { CollectionsSample.create(collection_id: collection.id, sample_id: sample.id) }

    it 'destroys also the association' do
      expect(CollectionsSample.count).to eq 2
      collection.destroy
      expect(CollectionsSample.count).to eq 1
    end
  end

  describe 'get_all_collection_for_user' do
    let(:user) { create(:user) }

    it 'returns the users all collection' do
      all_collection = described_class.get_all_collection_for_user(user.id)
      expect(all_collection).to be_present
      expect(all_collection.label).to eq 'All'
    end
  end

  describe '.serialized_shared_collections_for' do
    let(:owner) { create(:person) }
    let(:recipient) { create(:person) }
    let(:group) { create(:group, users: [recipient]) }
    let(:shared_collection) { create(:collection, user: owner) }

    def rows_for(user)
      described_class.serialized_shared_collections_for(user).to_a
    end

    context 'when the collection is shared directly and again through the users group' do
      before do
        create(:collection_share, collection: shared_collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        create(:collection_share, collection: shared_collection, shared_with: recipient,
                                  permission_level: CollectionShare.permission_level(:delete_elements))
      end

      it 'returns the collection exactly once' do
        expect(rows_for(recipient).map(&:id)).to eq([shared_collection.id])
      end

      it 'reports the highest of the two permission levels, matching what the policies enforce' do
        expect(rows_for(recipient).first.permission_level)
          .to eq(CollectionShare.permission_level(:delete_elements))
      end

      it 'exposes the recipients own share, never the groups' do
        own_share = CollectionShare.find_by(collection: shared_collection, shared_with: recipient)

        expect(rows_for(recipient).first.collection_share_id).to eq(own_share.id)
      end

      it 'flags that the collection also arrives through a group' do
        expect(rows_for(recipient).first.shared_via_group).to be true
      end
    end

    context 'when the collection is shared only through the users group' do
      before do
        create(:collection_share, collection: shared_collection, shared_with: group,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      it 'returns the collection' do
        expect(rows_for(recipient).map(&:id)).to eq([shared_collection.id])
      end

      # No share of the recipients own => nothing for them to reject. They leave the group instead.
      it 'exposes no collection_share_id' do
        expect(rows_for(recipient).first.collection_share_id).to be_nil
      end

      it 'flags the collection as group-derived' do
        expect(rows_for(recipient).first.shared_via_group).to be true
      end
    end

    context 'when the collection is shared only directly' do
      before do
        create(:collection_share, collection: shared_collection, shared_with: recipient,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      it 'is not flagged as group-derived and exposes the share' do
        row = rows_for(recipient).first

        expect(row.shared_via_group).to be false
        expect(row.collection_share_id).not_to be_nil
      end
    end

    context 'when the owner exists' do
      before do
        create(:collection_share, collection: shared_collection, shared_with: recipient,
                                  permission_level: CollectionShare.permission_level(:read_elements))
      end

      it 'exposes owner with the abbreviation and a plain owner_name for the tree label' do
        row = rows_for(recipient).first

        expect(row.owner).to eq("#{owner.first_name} #{owner.last_name}(#{owner.name_abbreviation})")
        expect(row.owner_name).to eq("#{owner.first_name} #{owner.last_name}")
      end
    end

    # A normal account deletion is a soft-delete that keeps the owner row; this covers the harder edge
    # of a hard-destroyed / dangling owner (no DB FK from collections to users). The recipient must not
    # lose the collection — the LEFT join keeps it and both owner strings fall back to a placeholder.
    context 'when the owner has been hard-destroyed (dangling user_id)' do
      before do
        create(:collection_share, collection: shared_collection, shared_with: recipient,
                                  permission_level: CollectionShare.permission_level(:read_elements))
        shared_collection.update_column(:user_id, 0) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'still returns the collection to the recipient' do
        expect(rows_for(recipient).map(&:id)).to eq([shared_collection.id])
      end

      it 'renders a deleted-owner placeholder for owner and owner_name' do
        row = rows_for(recipient).first

        expect(row.owner).to eq('Deleted user #0')
        expect(row.owner_name).to eq('Deleted user #0')
      end
    end
  end

  describe '#detail_levels_for_user' do
    let(:owner) { create(:person) }
    let(:user) { create(:person) }
    let(:group) { create(:group, users: [user]) }
    let(:collection) { create(:collection, user: owner) }

    let(:all_owner_levels) { described_class::DETAIL_LEVEL_KEYS.index_with { described_class::OWNER_LEVEL } }
    let(:all_zero) { described_class::DETAIL_LEVEL_KEYS.index_with { 0 } }

    it 'grants an owner every level' do
      own_collection = create(:collection, user: user)

      expect(own_collection.detail_levels_for_user(user)).to eq(all_owner_levels)
    end

    # own_collections_for / accessible_for / writable_by all treat a group's collection as its
    # members'. This used to compare `collection.user != current_user` and fall through to zeros.
    it 'grants a group member every level on a collection owned by that group' do
      group_collection = create(:collection, user: group)

      expect(group_collection.detail_levels_for_user(user)).to eq(all_owner_levels)
      expect(group_collection.owned_by?(user)).to be true
    end

    it 'returns zeros when the user has neither ownership nor a share' do
      expect(collection.detail_levels_for_user(user)).to eq(all_zero)
    end

    it 'returns the levels of a share held directly' do
      create(:collection_share, collection: collection, shared_with: user,
                                permission_level: 1, sample_detail_level: 3)

      levels = collection.detail_levels_for_user(user)

      expect(levels[:permission_level]).to eq(1)
      expect(levels[:sample_detail_level]).to eq(3)
    end

    # The whole point of Bug A: no share of the user's own, so the group's share must be found.
    it 'returns the levels of a share held only by the users group' do
      create(:collection_share, collection: collection, shared_with: group,
                                permission_level: 2, sample_detail_level: 7)

      levels = collection.detail_levels_for_user(user)

      expect(levels[:permission_level]).to eq(2)
      expect(levels[:sample_detail_level]).to eq(7)
    end

    context 'when the user holds both a direct and a group share' do
      # Deliberately crossed: the direct share wins on permission_level, the group's on
      # sample_detail_level. A "direct share wins" implementation fails the second expectation,
      # a "group wins" one fails the first.
      before do
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: 4, sample_detail_level: 1)
        create(:collection_share, collection: collection, shared_with: group,
                                  permission_level: 0, sample_detail_level: 9)
      end

      it 'resolves each level to the maximum across them' do
        levels = collection.detail_levels_for_user(user)

        expect(levels[:permission_level]).to eq(4)
        expect(levels[:sample_detail_level]).to eq(9)
      end
    end

    it 'ignores a share on the same collection held by somebody else' do
      create(:collection_share, collection: collection, shared_with: user, permission_level: 1)
      create(:collection_share, collection: collection, shared_with: create(:person), permission_level: 4)

      expect(collection.detail_levels_for_user(user)[:permission_level]).to eq(1)
    end

    it 'ignores a share held by a group the user does not belong to' do
      create(:collection_share, collection: collection, shared_with: create(:group), permission_level: 4)

      expect(collection.detail_levels_for_user(user)).to eq(all_zero)
    end
  end
end
