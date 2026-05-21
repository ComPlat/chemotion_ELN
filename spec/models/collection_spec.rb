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
end
