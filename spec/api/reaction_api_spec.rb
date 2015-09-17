require 'rails_helper'

describe Chemotion::ReactionAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }
    let(:r1)   { create(:reaction) }
    let(:r2)   { create(:reaction) }

    before do
      CollectionsReaction.create!(reaction: r1, collection: c1)
      CollectionsReaction.create!(reaction: r2, collection: c1)
    end

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/reactions' do
      before {
        get '/api/v1/reactions'
      }

      it 'returns serialized (unshared) reactions roots of logged in user' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.last.symbolize_keys).to include(
          id: r1.id,
          name: r1.name,
          type: 'reaction',
          collection_labels: ['C1']
        )
        expect(reactions.first.symbolize_keys).to include(
          id: r2.id,
          name: r2.name,
          type: 'reaction',
          collection_labels: ['C1']
        )
      end
    end
  end
end
