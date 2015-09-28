require 'rails_helper'

describe Chemotion::ReactionAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(Authentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/reactions' do
      let(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:r1)   { create(:reaction) }
      let(:r2)   { create(:reaction) }

      before {
        CollectionsReaction.create!(reaction: r1, collection: c1)
        CollectionsReaction.create!(reaction: r2, collection: c1)

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

    describe 'GET /api/v1/reactions/:id' do
      context 'with appropriate permissions' do
        let(:c1) { create(:collection, user: user, is_shared: true, permission_level: 0) }
        let(:c2) { create(:collection, user: user) }
        let(:r1) { create(:reaction) }
        let(:r2) { create(:reaction) }

        before do
          CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
          CollectionsReaction.create!(collection_id: c2.id, reaction_id: r2.id)
        end

        describe 'reading reaction r1' do
          before { get "/api/v1/reactions/#{r1.id}" }

          it 'is allowed' do
            expect(response.status).to eq 200
          end
        end

        describe 'reading reaction r2' do
          before { get "/api/v1/reactions/#{r2.id}" }

          it 'is allowed' do
            expect(response.status).to eq 200
          end
        end
      end

      context 'with inappropriate permissions' do
        let(:c1) { create(:collection, user_id: user.id + 1, is_shared: true, permission_level: 0) }
        let(:r1) { create(:reaction) }

        before do
          CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
        end

        describe 'reading reaction r1' do
          before { get "/api/v1/reactions/#{r1.id}" }

          it 'is not allowed' do
            expect(response.status).to eq 401
          end
        end
      end
    end

  end
end
