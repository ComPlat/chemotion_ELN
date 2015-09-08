require 'rails_helper'

describe Chemotion::ReactionAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:user) }
    let!(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }

    before do
      r1 = create(:reaction)
      r2 = create(:reaction)

      CollectionsReaction.create!(reaction: r1, collection: c1)
      CollectionsReaction.create!(reaction: r2, collection: c1)
    end

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/reactions' do
      it 'returns serialized (unshared) reactions roots of logged in user' do
        get '/api/v1/reactions'

        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.first.symbolize_keys).to include(
          id: 2,
          name: 'Reaction 2',
          type: 'reaction',
          collection_labels: ['C1']
        )
        expect(reactions.last.symbolize_keys).to include(
          id: 1,
          name: 'Reaction 1',
          type: 'reaction',
          collection_labels: ['C1']
        )
      end
    end
  end
end
