# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReactionAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    let(:new_root_container) { create(:root_container) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(user)
    end

    describe 'GET /api/v1/reactions' do
      let!(:c1) do
        create(:collection, label: 'C1', user: user, is_shared: false)
      end
      let!(:r1) { create(:reaction, name: 'r1', collections: [c1]) }
      let!(:r2) { create(:reaction, name: 'r2', collections: [c1]) }

      before { get '/api/v1/reactions' }

      it 'returns serialized (unshared) reactions roots of logged in user' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.map { |r| [r['id'], r['name']] }).to match_array(
          [[r1.id, r1.name], [r2.id, r2.name]]
        )
        expect(reactions.first).to include(
          'id' => r2.id, 'name' => r2.name, 'type' => 'reaction',
          'tag' => include(
            'taggable_id' => r2.id, 'taggable_type' => 'Reaction',
            'taggable_data' => include(
              'collection_labels' => include(
                'name' => 'C1', 'is_shared' => false, 'id' => c1.id,
                'user_id' => user.id, 'shared_by_id' => c1.shared_by_id,
                'is_synchronized' => c1.is_synchronized
              )
            )
          )
        )
      end
    end

    describe 'GET /api/v1/reactions/:id' do
      context 'with appropriate permissions' do
        let(:c1) do
          create(:collection, user: user, is_shared: true, permission_level: 0)
        end
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
        let(:c1) do
          create(
            :collection,
            user_id: user.id + 1, is_shared: true, permission_level: 0
          )
        end
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
        let(:c1) { create(:collection, user_id: user.id) }
        let(:r1) { create(:reaction, name: 'test', created_by: user.id) }
        let(:params) { { id: r1.id, collection_id: c1.id } }

        before do
          CollectionsReaction.create(reaction_id: r1.id, collection_id: c1.id)
          delete "/api/v1/reactions/#{r1.id}", params: params
        end

        it 'is able to delete a reaction' do
          reaction_id = r1.id
          r = Reaction.find_by(name: 'test')
          expect(r).to be_nil
          # a = Literature.where(reaction_id: reaction_id)
          # expect(a).to match_array([])
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
    end

    describe 'PUT /api/v1/reactions', focus: true do
      let(:collection_1) do
        Collection.create!(label: 'Collection #1', user: user)
      end
      let(:sample_1) { create(:sample, name: 'Sample 1') }
      let(:sample_2) { create(:sample, name: 'Sample 2') }
      let(:sample_3) { create(:sample, name: 'Sample 3') }
      let(:sample_4) { create(:sample, name: 'Sample 4') }

      let(:reaction_1) { create(:reaction, name: 'r1') }
      let(:reaction_container) do
        {
          'name' => 'new',
          'attachments' => [],
          'is_deleted' => false,
          'is_new' => false,
          'containable_type' => 'Reaction',
          'containable_id' => reaction_1.id,
          'description' => '',
          'container_type' => 'root',
          'extended_metadata' => {},
          'children' => []
        }
      end

      before do
        CollectionsReaction.create(
          reaction_id: reaction_1.id, collection_id: collection_1.id
        )
        ReactionsStartingMaterialSample.create!(
          reaction: reaction_1, sample: sample_1, reference: true, equivalent: 1
        )
        ReactionsReactantSample.create!(
          reaction: reaction_1, sample: sample_2, equivalent: 2
        )
        ReactionsProductSample.create!(
          reaction: reaction_1, sample: sample_3, equivalent: 1
        )
        ReactionsProductSample.create!(
          reaction: reaction_1, sample: sample_4, equivalent: 1
        )
      end

      context 'updating and reassigning existing materials' do
        let(:params) do
          {
            'id' => reaction_1.id,
            'name' => 'new name',
            'container' => reaction_container,
            'materials' => {
              'starting_materials' => [
                {
                  'id' => sample_1.id,
                  'target_amount_unit' => 'mg',
                  'target_amount_value' => 76.09596,
                  'equivalent' => 1,
                  'reference' => true,
                  'is_new' => false
                },
                {
                  'id' => sample_2.id,
                  'target_amount_unit' => 'mg',
                  'target_amount_value' => 99.08404,
                  'equivalent' => 5.5,
                  'reference' => false,
                  'is_new' => false
                }
              ],
              'products' => [
                {
                  'id' => sample_3.id,
                  'target_amount_unit' => 'mg',
                  'target_amount_value' => 99.08404,
                  'equivalent' => 5.5,
                  'reference' => false,
                  'is_new' => false
                }
              ]
            }
          }
        end

        before do
          put "/api/v1/reactions/#{reaction_1.id}", params: params
        end

        let(:r) { Reaction.find(reaction_1.id) }

        it 'updates the reaction attributes' do
          expect(r.name).to eq('new name')
        end

        it 'updates the sample attributes' do
          s1 = r.starting_materials.find(sample_1.id)
          s2 = r.starting_materials.find(sample_2.id)
          expect(s1.attributes).to include(
            'target_amount_unit' => 'mg', 'target_amount_value' => 76.09596
          )
          expect(s2.attributes).to include(
            'target_amount_unit' => 'mg', 'target_amount_value' => 99.08404
          )
        end

        it 'materials associations and reassign to a new group' do
          sa1 = r.reactions_starting_material_samples
                 .find_by(sample_id: sample_1.id)
          sa2 = r.reactions_starting_material_samples
                 .find_by(sample_id: sample_2.id)
          sa2_eq = (sa2.sample.amount_mmol / sa1.sample.amount_mmol).round(14)
          expect(sa1.attributes).to include(
            'reference' => true, 'equivalent' => 1.0
          )
          expect(sa2.attributes).to include('reference' => false)
          expect(sa2.equivalent.round(14)).to eq(sa2_eq)
          expect(r.reactions_reactant_samples).to be_empty
        end

        it 'deletes only not included samples' do
          expect(
            r.reactions_product_samples.find_by(sample_id: sample_3.id)
          ).to be_present
          expect(
            r.reactions_product_samples.find_by(sample_id: sample_4.id)
          ).not_to be_present
        end
      end

      context 'creating new materials' do
        let(:params) do
          {
            'id' => reaction_1.id,
            'name' => 'new name',
            'container' => new_root_container,
            'materials' => {
              'starting_materials' => [
                {
                  'id' => sample_1.id,
                  'target_amount_unit' => 'mg',
                  'target_amount_value' => 76.09596,
                  'equivalent' => 1,
                  'reference' => false,
                  'is_new' => false
                },
                {
                  'id' => sample_2.id,
                  'amount_unit' => 'mg',
                  'amount_value' => 99.08404,
                  'equivalent' => 5.5,
                  'reference' => false,
                  'is_new' => false,
                  'container' => new_root_container
                }
              ],
              'products' => [
                'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
                'name' => 'New Subsample 1',
                'target_amount_unit' => 'mg',
                'target_amount_value' => 76.09596,
                'parent_id' => sample_1.id,
                'reference' => true,
                'equivalent' => 1,
                'is_new' => true,
                'is_split' => true,
                'container' => new_root_container
              ]
            }
          }
        end

        before do
          put("/api/v1/reactions/#{reaction_1.id}.json",
            params: params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' }
          )
        end

        let(:r) { Reaction.find(reaction_1.id) }

        it 'creates subsamples' do
          subsample = r.products.last
          expect(subsample.parent).to eq(sample_1)
          expect(subsample.attributes).to include(
            'name' => sample_1.name, 'target_amount_value' => 76.09596,
            'target_amount_unit' => 'mg'
          )
          subsample_association = r.reactions_product_samples
                                   .find_by(sample_id: subsample.id)
          expect(subsample_association.attributes).to include(
            'reference' => true, 'equivalent' => 1
          )
        end
      end
    end

    describe 'POST /api/v1/reactions', focus: true do
      let(:collection_1) do
        Collection.create!(label: 'Collection #1', user: user)
      end
      let(:sample_1) do
        create(
          :sample, name: 'Sample 1', container: FactoryBot.create(:container)
        )
      end
      let(:molfile_1) { sample_1.molecule.molfile }

      context 'creating new materials' do
        let(:params) do
          {
            'name' => 'r001',
            'collection_id' => collection_1.id,
            'container' => new_root_container,
            'materials' => {
              'products' => [
                'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
                'name' => 'New Subsample 1',
                'target_amount_unit' => 'mg',
                'target_amount_value' => 76.09596,
                'parent_id' => sample_1.id,
                'reference' => true,
                'equivalent' => 1,
                'is_new' => true,
                'is_split' => true,
                'molecule' => { molfile: molfile_1 },
                'container' => new_root_container
              ],
              'reactants' => [
                'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e336',
                'name' => 'Copied Sample',
                'solvent' => 'solvent1',
                'target_amount_unit' => 'mg',
                'target_amount_value' => 86.09596,
                'parent_id' => sample_1.id,
                'reference' => false,
                'equivalent' => 2,
                'is_new' => true,
                'is_split' => false,
                # 'molecule' => { molfile: molfile_1 },
                'molfile' => molfile_1,
                'container' => new_root_container
              ]
            }
          }
        end

        before do
          post('/api/v1/reactions.json',
            params: params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' }
          )
        end

        let(:r) { Reaction.find_by(name: 'r001') }

        it 'creates subsamples' do
          subsample = r.products.last

          expect(subsample.parent).to eq(sample_1)
          expect(subsample.attributes).to include(
            'name' => sample_1.name,
            'target_amount_value' => 76.09596,
            'target_amount_unit' => 'mg'
          )

          subsample_association = r.reactions_product_samples
                                   .find_by(sample_id: subsample.id)
          expect(subsample_association.attributes).to include(
            'reference' => true, 'equivalent' => 1
          )
        end

        it 'createds a copied sample' do
          reactant = r.reactants.last
          expect(reactant.attributes).to include(
            'name' => 'Copied Sample',
            'target_amount_value' => 86.09596,
            'target_amount_unit' => 'mg',
            'solvent' => 'solvent1'
          )
          reactant_association = r.reactions_reactant_samples
                                  .find_by(sample_id: reactant.id)
          expect(reactant_association.attributes).to include(
            'reference' => false, 'equivalent' => 2
          )
        end
      end

      context 'creating a copied reaction' do
        let!(:new_container) do
          {
            'name' => 'new',
            'attachments' => [],
            'is_deleted' => false,
            'is_new' => false,
            'containable_type' => 'Reaction',
            'containable_id' => 1,
            'description' => '',
            'container_type' => 'root',
            'extended_metadata' => {},
            'children' => []
          }
        end

        let(:params) do
          {
            'name' => ' Copy',
            'collection_id' => collection_1.id,
            'container' => new_container,
            'materials' => {
              'products' => [
                'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
                'name' => 'JHX-1-A',
                'target_amount_unit' => 'mg',
                'target_amount_value' => 76.09596,
                'reference' => true,
                'equivalent' => 1,
                'is_new' => true,
                'is_split' => true,
                # 'molecule' => { molfile: molfile_1 },
                'molfile' => molfile_1,
                'container' => new_container
              ]
            }
          }
        end

        before do
          post '/api/v1/reactions', params: params, as: :json
        end

        let(:r) { Reaction.last }

        it 'create products with name realted to the reaction short_label' do
          product = r.products.first
          expect(product.name).to include(r.short_label)
        end
      end
    end
  end
end
