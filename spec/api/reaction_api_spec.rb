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
          collection_labels: [['C1', false]]
        )
        expect(reactions.first.symbolize_keys).to include(
          id: r2.id,
          name: r2.name,
          type: 'reaction',
          collection_labels: [['C1', false]]
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

    describe 'DELETE /api/v1/reactions' do
      context 'with valid parameters' do

        it 'should be able to delete a reaction' do
          r = Reaction.create(name: 'test')
          reaction_id = r.id
          CollectionsReaction.create(reaction_id: r.id, collection_id: 1)
          delete "/api/v1/reactions/#{reaction_id}", { id: reaction_id }
          r = Reaction.find_by(name: 'test')
          expect(r).to be_nil
          a = Literature.where(reaction_id: reaction_id)
          expect(a).to match_array([])
          a = CollectionsReaction.where(reaction_id: reaction_id)
          expect(a).to match_array([])
          a = ReactionsProductSample.where(reaction_id: reaction_id)
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(reaction_id: reaction_id)
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(reaction_id: reaction_id)
          expect(a).to match_array([])
        end
      end

      context 'with UIState' do
        let(:c1) { create(:collection, user: user) }
        let!(:reaction_1) { create(:reaction, name: 'test_1')}
        let!(:reaction_2) { create(:reaction, name: 'test_2')}
        let!(:reaction_3) { create(:reaction, name: 'test_3')}

        let!(:params_all_false) {
          {
            all: false,
            included_ids: [reaction_1.id, reaction_2.id],
            excluded_ids: []
          }
        }

        let!(:params_all_true) {
          {
            all: true,
            included_ids: [],
            excluded_ids: [reaction_3.id]
          }
        }

        before do
          CollectionsReaction.create!(collection: c1, reaction: reaction_1)
          CollectionsReaction.create!(collection: c1, reaction: reaction_2)
          CollectionsReaction.create!(collection: c1, reaction: reaction_3)
        end

        it 'should be able to delete reaction when "all" is false' do
          reaction_ids = [reaction_1.id, reaction_2.id]
          array = Reaction.where(id: reaction_ids).to_a
          expect(array).to match_array([reaction_1, reaction_2])
          CollectionsReaction.create(reaction_id: reaction_1.id, collection_id: 1)
          CollectionsReaction.create(reaction_id: reaction_2.id, collection_id: 1)
          r = Reaction.find_by(id: reaction_3.id)
          expect(r).to_not be_nil
          delete '/api/v1/reactions/ui_state/', { ui_state: params_all_false }
          r = Reaction.find_by(id: reaction_3.id)
          expect(r).to_not be_nil
          array = Reaction.where(id: reaction_ids).to_a
          expect(array).to match_array([])
          a = CollectionsReaction.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsProductSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
        end

        it 'should be able to delete reactions when "all" is false' do
          reaction_ids = [reaction_1.id, reaction_2.id]
          array = Reaction.where(id: reaction_ids).to_a
          expect(array).to match_array([reaction_1, reaction_2])
          CollectionsReaction.create(reaction_id: reaction_1.id, collection_id: 1)
          CollectionsReaction.create(reaction_id: reaction_2.id, collection_id: 1)
          r = Reaction.find_by(id: reaction_3.id)
          expect(r).to_not be_nil
          delete '/api/v1/reactions/ui_state/', { ui_state: params_all_true }
          r = Reaction.find_by(id: reaction_3.id)
          expect(r).to_not be_nil
          array = Reaction.where(id: reaction_ids).to_a
          expect(array).to match_array([])
          a = CollectionsReaction.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsProductSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsReactantSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
          a = ReactionsStartingMaterialSample.where(reaction_id: reaction_ids).to_a
          expect(a).to match_array([])
        end

      end
    end
  end
end
