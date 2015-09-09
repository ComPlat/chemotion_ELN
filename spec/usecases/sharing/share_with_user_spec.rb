require 'rails_helper'

RSpec.describe Usecases::Sharing::ShareWithUser do
  let(:params) {
    {
      # TODO parent of collection?
      collection_attributes: {
        user_id: 7,
        label: 'test',
        shared_by_id: 10,
        is_shared: true,
        permission_level: 1,
        sample_detail_level: 2,
        reaction_detail_level: 3,
        wellplate_detail_level: 4
      },
      sample_ids: [1, 10],
      reaction_ids: [1, 3]
    }
  }

  subject { described_class.new(params) }

  describe 'execute!' do
    before { subject.execute! }

    it 'creates shared collection according to given params' do
      c = Collection.find_by(label: 'test')

      expect(c).to_not be_nil
      expect(c.user_id).to eq(7)
      expect(c.shared_by_id).to eq(10)
      expect(c.is_shared).to eq(true)
      expect(c.permission_level).to eq(1)
      expect(c.sample_detail_level).to eq(2)
      expect(c.reaction_detail_level).to eq(3)
      expect(c.wellplate_detail_level).to eq(4)
    end

    it 'creates sample associations according to given params' do
      c = Collection.find_by(label: 'test')
      associated_sample_ids = CollectionsSample.where(collection_id: c.id).pluck(:sample_id)

      expect(associated_sample_ids).to match_array([1,10])
    end

    it 'creates reaction associations according to given params' do
      c = Collection.find_by(label: 'test')
      associated_reaction_ids = CollectionsReaction.where(collection_id: c.id).pluck(:reaction_id)
      expect(associated_reaction_ids).to match_array([1,3])
    end
    
  end
end
