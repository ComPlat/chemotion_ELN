# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_shares
#
#  id                                            :bigint           not null, primary key
#  celllinesample_detail_level                   :integer          default(0), not null
#  devicedescription_detail_level                :integer          default(0), not null
#  element_detail_level                          :integer          default(0), not null
#  permission_level                              :integer          default(0), not null
#  reaction_detail_level                         :integer          default(0), not null
#  researchplan_detail_level                     :integer          default(0), not null
#  sample_detail_level                           :integer          default(0), not null
#  screen_detail_level                           :integer          default(0), not null
#  sequencebasedmacromoleculesample_detail_level :integer          default(0), not null
#  wellplate_detail_level                        :integer          default(0), not null
#  created_at                                    :datetime         not null
#  updated_at                                    :datetime         not null
#  collection_id                                 :bigint
#  shared_with_id                                :bigint           not null
#
# Indexes
#
#  index_collection_shares_on_collection_id                     (collection_id)
#  index_collection_shares_on_collection_id_and_shared_with_id  (collection_id,shared_with_id) UNIQUE
#  index_collection_shares_on_shared_with_id                    (shared_with_id)
#
# Foreign Keys
#
#  fk_rails_...  (collection_id => collections.id)
#  fk_rails_...  (shared_with_id => users.id)
#
require 'rails_helper'

RSpec.describe CollectionShare do
  let(:owner) { create(:person) }
  let(:user) { create(:person) }
  let(:group) { create(:group, users: [user]) }
  let(:owners_collection) { create(:collection, user: owner) }
  let(:other_collection) { create(:collection) }

  describe 'associations' do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to belong_to(:shared_with).class_name('User') }

    it 'still resolves a soft-deleted recipient' do
      share = create(:collection_share, shared_with: user)
      user.destroy

      expect(described_class.find(share.id).shared_with).to eq user
    end
  end

  describe '.permission_level' do
    it 'maps a key to its level' do
      expect(described_class.permission_level(:manage_shares)).to eq 4
    end

    it 'raises for an unknown key' do
      expect { described_class.permission_level(:destroy_everything) }.to raise_error(KeyError)
    end
  end

  describe '.shared_by' do
    it 'returns the shares of the collections the user owns' do
      own = create(:collection_share, collection: owners_collection)
      create(:collection_share, collection: other_collection)

      expect(described_class.shared_by(owner)).to contain_exactly(own)
    end
  end

  describe 'recipient scopes' do
    let!(:direct) { create(:collection_share, collection: owners_collection, shared_with: user) }
    let!(:via_group) { create(:collection_share, collection: other_collection, shared_with: group) }

    before { create(:collection_share, collection: owners_collection, shared_with: create(:person)) }

    describe '.shared_with' do
      it 'includes shares addressed to the user and to their groups' do
        expect(described_class.shared_with(user)).to contain_exactly(direct, via_group)
      end
    end

    describe '.shared_directly_with' do
      it 'includes only shares addressed to the user personally' do
        expect(described_class.shared_directly_with(user)).to contain_exactly(direct)
      end
    end
  end

  describe '.with_minimum_permission_level' do
    let!(:reader) { create(:collection_share, permission_level: 0) }
    let!(:editor) { create(:collection_share, permission_level: 1) }
    let!(:manager) { create(:collection_share, permission_level: 4) }

    it 'returns shares at or above the given level' do
      expect(described_class.with_minimum_permission_level(1)).to contain_exactly(editor, manager)
    end

    it 'returns every share for level 0' do
      expect(described_class.with_minimum_permission_level(0)).to contain_exactly(reader, editor, manager)
    end
  end

  describe '.with_minimum_detail_level' do
    let!(:low) { create(:collection_share, sample_detail_level: 1, reaction_detail_level: 10) }
    let!(:high) { create(:collection_share, sample_detail_level: 10, reaction_detail_level: 0) }

    it 'filters on the given detail level column' do
      expect(described_class.with_minimum_detail_level('sample_detail_level', 3)).to contain_exactly(high)
    end

    it 'uses the column it is given' do
      expect(described_class.with_minimum_detail_level('reaction_detail_level', 3)).to contain_exactly(low)
    end
  end
end
