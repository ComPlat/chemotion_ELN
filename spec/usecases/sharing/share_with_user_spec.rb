require 'rails_helper'

RSpec.describe Usecases::Sharing::ShareWithUser do
  let(:user)        { create(:user) }
  let(:collection)  { create(:collection, user: user) }
  let(:sample_1)    { create(:sample) }
  let(:sample_2)    { create(:sample) }
  let(:reaction_1)  { create(:reaction) }
  let(:reaction_2)  { create(:reaction) }
  let(:wellplate_1) { create(:wellplate) }
  let(:wellplate_2) { create(:wellplate) }
  let(:screen_1)    { create(:screen) }
  let(:screen_2)    { create(:screen) }
  # associated elements
  let(:sample_a1)   { create(:sample) }
  let(:wellplate_a) { create(:wellplate) }
  let(:wellplate_b) { create(:wellplate) }

  let(:params) {
    {
      collection_attributes: {
        user_id: user.id,
        label: 'test',
        shared_by_id: 10,
        is_shared: true,
        permission_level: 1,
        sample_detail_level: 2,
        reaction_detail_level: 3,
        wellplate_detail_level: 4
      },
      sample_ids: [sample_1.id, sample_2.id],
      reaction_ids: [reaction_1.id, reaction_2.id],
      wellplate_ids: [wellplate_1.id, wellplate_2.id],
      screen_ids: [screen_1.id]
    }
  }

  subject { described_class.new(params) }

  before do
    CollectionsSample.create!(collection: collection, sample: sample_1)
    CollectionsSample.create!(collection: collection, sample: sample_2)
    CollectionsSample.create!(collection: collection, sample: sample_a1)
    CollectionsReaction.create!(collection: collection, reaction: reaction_1)
    CollectionsReaction.create!(collection: collection, reaction: reaction_2)
    CollectionsWellplate.create!(collection: collection, wellplate: wellplate_1)
    CollectionsWellplate.create!(collection: collection, wellplate: wellplate_2)
    CollectionsWellplate.create!(collection: collection, wellplate: wellplate_a)
    CollectionsWellplate.create!(collection: collection, wellplate: wellplate_b)
    CollectionsScreen.create!(collection: collection, screen: screen_1)
    CollectionsScreen.create!(collection: collection, screen: screen_2)
    ReactionsProductSample.create!(reaction: reaction_1, sample: sample_a1)
    ReactionsReactantSample.create!(reaction: reaction_2, sample: sample_a1)
    ScreensWellplate.create!(screen: screen_1, wellplate: wellplate_a)
  end

  describe 'execute!' do
    before { subject.execute! }

    it 'creates shared collection according to given params' do
      c = Collection.find_by(label: 'test')

      expect(c).to_not be_nil
      expect(c.user_id).to eq(user.id)
      expect(c.shared_by_id).to eq(10)
      expect(c.is_shared).to eq(true)
      expect(c.permission_level).to eq(1)
      expect(c.sample_detail_level).to eq(2)
      expect(c.reaction_detail_level).to eq(3)
      expect(c.wellplate_detail_level).to eq(4)
    end

    it 'creates sample associations according to given params' do
      associated_sample_ids = Collection.find_by(label: 'test').sample_ids
      expect(associated_sample_ids).to match_array([sample_1.id,sample_2.id, sample_a1.id])
    end

    it 'creates reaction associations according to given params' do
      associated_reaction_ids = Collection.find_by(label: 'test').reaction_ids
      expect(associated_reaction_ids).to match_array([reaction_1.id, reaction_2.id])
    end

    it 'creates wellplate associations according to given params' do
      associated_wellplate_ids = Collection.find_by(label: 'test').wellplate_ids
      expect(associated_wellplate_ids).to match_array([wellplate_1.id, wellplate_2.id, wellplate_a.id])
    end

    it 'creates screen associations according to given params' do
      associated_screen_ids = Collection.find_by(label: 'test').screen_ids
      expect(associated_screen_ids).to match_array([screen_1.id])
    end
  end
end
