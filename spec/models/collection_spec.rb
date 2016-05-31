require 'rails_helper'

RSpec.describe Collection, type: :model do
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

  describe 'scopes' do
    let(:collection_1) { create(:collection, is_shared: false) }
    let(:collection_2) { create(:collection, shared_by_id: 2, is_shared: true) }
    let(:collection_3) { create(:collection, shared_by_id: 3, is_shared: true) }

    describe 'shared scope' do
      it 'returns collections the specified user has shared' do
        expect(Collection.shared(2)).to match_array [collection_2]
      end
    end

    describe 'remote scope' do
      it 'returns collections that have been shared with specified user' do
        expect(Collection.remote(2)).to match_array [collection_3]
      end
    end

    describe 'unshared scope' do
      it 'returns unshared collections' do
        expect(Collection.unshared).to match_array [collection_1]
      end
    end
  end

  describe 'get_all_collection_for_user' do
    let(:user) { create(:user) }

    it 'returns the users all collection' do
      all_collection = Collection.get_all_collection_for_user(user.id)
      expect(all_collection).to be_present
      expect(all_collection.label).to eq 'All'
    end
  end

  describe 'bulk_update' do
    let(:c1) { create(:collection) }
    let(:c2) { create(:collection, parent: c1) }
    let(:c3) { create(:collection, parent: c2) }
    let(:c4) { create(:collection, parent: c1) }

    let(:valid_attr) {
      [
        {
          'id' => c1.id,
          'label' => 'new label',
          'children' => [
            {
              'id' => 3.14,
              'label' => 'also new',
              'isNew' => true
            }
          ]
        },
        {
          'id' => 0.412,
          'label' => 'new collection',
          'isNew' => true,
          'children' => [
            {
              'id' => c2.id,
              'label' => c2.label,
              'children' => []
            }
          ]
        },
        {
          'id' => c4.id,
          'label' => 'updated c4',
          'children' => []
        }
      ]
    }

    context 'all attributes are valid' do
      before { described_class.bulk_update(c1.user_id, valid_attr, [c3.id]) }

      it 'updates existing and create new collections with parent child associations' do
        c_1 = Collection.find(c1.id)
        c_1_children = c_1.children
        expect(c_1.label).to eq 'new label'
        expect(c_1_children.size).to eq 1
        expect(c_1_children.first.label).to eq 'also new'

        c = Collection.find_by(label: 'new collection')
        expect(c).to_not be_nil
        expect(c.children).to eq [c2]

        c_2 = Collection.find(c2.id)
        expect(c_2.parent).to eq c

        # c3 should be deleted because it doesn't appear in valid_attr
        expect(Collection.find_by(id: c3.id)).to be_nil

        # c4 should now be a root node
        c_4 = Collection.find(c4.id)
        expect(c_4.parent).to be_nil
        expect(c_4.label).to eq 'updated c4'
      end
    end

    context 'some attributes are invalid' do
      it 'does not update a single collection' do

      end
    end
  end
end
