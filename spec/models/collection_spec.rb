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
  end
end
