# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Collections::WithdrawElements do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:user_all) { Collection.get_all_collection_for_user(user.id) }
  let(:user_sub) { create(:collection, user: user, label: 'sub') }

  # mirror Grape's indifferent-access params (by_ui_state reads symbol keys)
  def selection_for(sample)
    { sample: { all: false, included_ids: [sample.id] } }.with_indifferent_access
  end

  def withdraw_from(collection, sample, options: {})
    described_class.new(user).perform!(
      source_collection: collection, ui_state: selection_for(sample), options: options
    )
  end

  describe 'a sole-owned sample' do
    let(:sample) { create(:sample, creator: user, collections: [user_all, user_sub]) }

    before { sample }

    it 'is unlinked from all the owner\'s collections and destroyed as an orphan' do
      expect { withdraw_from(user_sub, sample) }.to change(Sample, :count).by(-1)
      expect(sample.reload.collections.where(id: [user_all.id, user_sub.id])).to be_empty
    end

    it 'reports the id as having left the view' do
      result = withdraw_from(user_sub, sample)
      expect(result['sample']).to contain_exactly(sample.id)
    end
  end

  describe 'a dual-owned sample (also in another user\'s collection)' do
    let(:foreign) { create(:collection, user: other_user, label: 'foreign') }
    let(:sample) { create(:sample, creator: user, collections: [user_all, user_sub, foreign]) }

    before { sample }

    it 'is withdrawn from the owner\'s collections but NOT destroyed — the other owner keeps it' do
      expect { withdraw_from(user_sub, sample) }.not_to change(Sample, :count)

      cols = sample.reload.collections
      expect(cols.where(id: [user_all.id, user_sub.id])).to be_empty # gone from the actor's tree
      expect(cols.where(id: foreign.id)).to be_present               # still in the other owner's collection
    end
  end

  describe 'a sample that is only in a foreign collection (actor has no ownership)' do
    let(:foreign) { create(:collection, user: other_user) }
    let(:sample) { create(:sample, creator: other_user, collections: [foreign]) }

    before do
      sample
      # the actor sees it via a share, but has no own-collection membership
      create(:collection_share, collection: foreign, shared_with: user,
                                permission_level: CollectionShare.permission_level(:read_elements))
    end

    it 'is left untouched (no standing to withdraw it)' do
      expect { withdraw_from(foreign, sample) }.not_to change(Sample, :count)
      expect(sample.reload.collections.where(id: foreign.id)).to be_present
    end
  end

  describe 'a sample kept by the reaction association guard' do
    let(:reaction) { create(:reaction, creator: user, collections: [user_sub]) }
    let(:sample) { create(:sample, creator: user, collections: [user_all, user_sub]) }

    before do
      # sample is a reactant of a reaction living in the same collection
      ReactionsReactantSample.create!(reaction: reaction, sample: sample, reference: false)
    end

    it 'is not unlinked from a collection that still holds its reaction, and is not destroyed' do
      expect { withdraw_from(user_sub, sample) }.not_to change(Sample, :count)
      expect(sample.reload.collections.where(id: user_sub.id)).to be_present
    end
  end

  describe 'a group member withdrawing a group-owned element' do
    let(:group) { create(:group, users: [user]) }
    let(:group_all) { Collection.get_all_collection_for_user(group.id) }
    let(:group_col) { create(:collection, user: group, label: 'group project') }
    let(:sample) { create(:sample, creator: user, collections: [group_col]) }

    before { sample }

    it 'withdraws (and destroys the orphan) because group-owned collections count as owned' do
      expect { withdraw_from(group_col, sample) }.to change(Sample, :count).by(-1)
    end
  end
end
