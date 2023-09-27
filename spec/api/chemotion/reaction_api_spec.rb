# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReactionAPI do
  include_context 'api request authorization context'

  let(:new_root_container) { create(:root_container) }

  describe 'GET /api/v1/reactions' do
    let!(:c1) do
      create(:collection, label: 'C1', user: user, is_shared: false, reaction_detail_level: 10)
    end
    let!(:c2) do
      create(:collection, label: 'C2', user: user, is_shared: false, reaction_detail_level: 10)
    end
    let!(:r1) { create(:reaction, name: 'r1', collections: [c1]) }
    let!(:r2) { create(:reaction, name: 'r2', collections: [c1]) }
    let!(:r3) { create(:reaction, name: 'r3', collections: [c2]) }

    context 'without params' do
      before { get '/api/v1/reactions' }

      it 'returns serialized (unshared) reactions roots of logged in user' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.map { |r| [r['id'], r['name']] }).to match_array(
          [[r1.id, r1.name], [r2.id, r2.name], [r3.id, r3.name]],
        )
        expect(reactions.first).to include(
          'id' => r3.id, 'name' => r3.name, 'type' => 'reaction',
          'tag' => include(
            'taggable_id' => r3.id, 'taggable_type' => 'Reaction',
            'taggable_data' => include(
              'collection_labels' => include(
                'name' => 'C2', 'is_shared' => false, 'id' => c2.id,
                'user_id' => user.id, 'shared_by_id' => c2.shared_by_id,
                'is_synchronized' => c2.is_synchronized
              ),
            )
          )
        )
      end
    end

    context 'with ID of collection' do
      before { get '/api/v1/reactions', params: { collection_id: c1.id } }

      it 'returns serialized reaction' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.pluck('id')).to eq([r2.id, r1.id])
      end
    end

    context 'with ID of non-existing collection' do
      before { get '/api/v1/reactions', params: { collection_id: -1 } }

      it 'does not return reaction' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.size).to be(0)
      end
    end

    context 'with ID of synced collection' do
      let(:sharer) { create(:person) }
      let(:sync_collections_user) do
        create(:sync_collections_user, collection: c1, user: user, sharer: sharer)
      end

      before do
        get '/api/v1/reactions', params: { sync_collection_id: sync_collections_user.id }
      end

      it 'returns serialized reaction' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.pluck('id')).to eq([r2.id, r1.id])
      end
    end

    context 'with ID of non-existing synced collection' do
      before do
        get '/api/v1/reactions', params: { sync_collection_id: -1 }
      end

      it 'does not return reaction' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.size).to be(0)
      end
    end

    context 'with sort_column' do
      let(:collection) { create(:collection, user: user, is_shared: false) }
      let(:reaction1) do
        create(
          :reaction,
          updated_at: Time.current,
          rxno: 'A',
          rinchi_short_key: 'C',
          collections: [collection],
        )
      end
      let(:reaction2) do
        create(
          :reaction,
          updated_at: 1.minute.ago,
          rxno: 'C',
          rinchi_short_key: 'B',
          collections: [collection],
        )
      end
      let(:reaction3) do
        create(
          :reaction,
          updated_at: 1.minute.from_now,
          rxno: 'B',
          rinchi_short_key: 'A',
          collections: [collection],
        )
      end

      before do
        Reaction.skip_callback(:save, :before, :generate_rinchis)
        reaction1
        reaction2
        reaction3
        Reaction.set_callback(:save, :before, :generate_rinchis)
      end

      it 'returns sorted reactions per default by short_label' do
        get '/api/v1/reactions', params: { collection_id: collection.id }

        expect(JSON.parse(response.body)['reactions'].pluck('id')).to eq(
          [
            reaction3.id,
            reaction2.id,
            reaction1.id,
          ],
        )
      end

      it 'returns sorted reactions by updated_at' do
        get '/api/v1/reactions', params: { collection_id: collection.id, sort_column: 'created_at' }

        expect(JSON.parse(response.body)['reactions'].pluck('id')).to eq(
          [
            reaction3.id,
            reaction2.id,
            reaction1.id,
          ],
        )
      end

      it 'returns sorted reactions by rxno' do
        get '/api/v1/reactions', params: { collection_id: collection.id, sort_column: 'rxno' }

        expect(JSON.parse(response.body)['reactions'].pluck('id')).to eq(
          [
            reaction1.id,
            reaction3.id,
            reaction2.id,
          ],
        )
      end

      it 'returns sorted reactions by rinchi_short_key' do
        get '/api/v1/reactions', params: { collection_id: collection.id, sort_column: 'rinchi_short_key' }

        expect(JSON.parse(response.body)['reactions'].pluck('id')).to eq(
          [
            reaction3.id,
            reaction2.id,
            reaction1.id,
          ],
        )
      end

      it 'gives error for invalid value for sort_column' do
        get '/api/v1/reactions', params: { collection_id: collection.id, sort_column: 'not_allowed' }

        expect(response).to have_http_status(:bad_request)
        expect(JSON.parse(response.body)['error']).to eq('sort_column does not have a valid value')
      end
    end
  end

  describe 'GET /api/v1/reactions/:id' do
    context 'with appropriate permissions' do
      let(:c1) do
        create(:collection, user: user, is_shared: true, permission_level: 0)
      end
      let(:c2) { create(:collection, user: user) }
      let(:r1) { create(:reaction) }

      before do
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
        get "/api/v1/reactions/#{r1.id}"
      end

      it 'is allowed to read reaction' do
        expect(response).to have_http_status(:ok)
      end
    end

    context 'with inappropriate permissions' do
      let(:c1) do
        create(
          :collection,
          user_id: user.id + 1, is_shared: true, permission_level: 0,
        )
      end
      let(:r1) { create(:reaction) }

      before do
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
        get "/api/v1/reactions/#{r1.id}"
      end

      it 'is not allowed to read reaction' do
        expect(response).to have_http_status(:unauthorized)
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

  describe 'PUT /api/v1/reactions' do
    let(:collection1) do
      Collection.create!(label: 'Collection #1', user: user)
    end
    let(:sample1) { create(:sample, name: 'Sample 1') }
    let(:sample2) { create(:sample, name: 'Sample 2') }
    let(:sample3) { create(:sample, name: 'Sample 3') }
    let(:sample4) { create(:sample, name: 'Sample 4') }

    let(:reaction1) { create(:reaction, name: 'r1') }
    let(:reaction_container) do
      {
        'name' => 'new',
        'attachments' => [],
        'is_deleted' => false,
        'is_new' => false,
        'containable_type' => 'Reaction',
        'containable_id' => reaction1.id,
        'description' => '',
        'container_type' => 'root',
        'extended_metadata' => {},
        'children' => [],
      }
    end

    before do
      CollectionsReaction.create(
        reaction_id: reaction1.id, collection_id: collection1.id,
      )
      ReactionsStartingMaterialSample.create!(
        reaction: reaction1, sample: sample1, reference: true, equivalent: 1,
      )
      ReactionsReactantSample.create!(
        reaction: reaction1, sample: sample2, equivalent: 2,
      )
      ReactionsProductSample.create!(
        reaction: reaction1, sample: sample3, equivalent: 1,
      )
      ReactionsProductSample.create!(
        reaction: reaction1, sample: sample4, equivalent: 1,
      )
    end

    context 'when updating and reassigning existing materials' do
      let(:params) do
        {
          'id' => reaction1.id,
          'name' => 'new name',
          'container' => reaction_container,
          'materials' => {
            'starting_materials' => [
              {
                'id' => sample1.id,
                'target_amount_unit' => 'mg',
                'target_amount_value' => 76.09596,
                'equivalent' => 1,
                'reference' => true,
                'is_new' => false,
              },
              {
                'id' => sample2.id,
                'target_amount_unit' => 'mg',
                'target_amount_value' => 99.08404,
                'equivalent' => 5.5,
                'reference' => false,
                'is_new' => false,
              },
            ],
            'products' => [
              {
                'id' => sample3.id,
                'target_amount_unit' => 'mg',
                'target_amount_value' => 99.08404,
                'equivalent' => 5.5,
                'reference' => false,
                'is_new' => false,
              },
            ],
          },
        }
      end
      let(:r) { Reaction.find(reaction1.id) }

      before do
        put "/api/v1/reactions/#{reaction1.id}", params: params, as: :json
      end

      it 'updates the reaction attributes' do
        expect(r.name).to eq('new name')
      end

      it 'updates the sample attributes' do
        s1 = r.starting_materials.find(sample1.id)
        s2 = r.starting_materials.find(sample2.id)
        expect(s1.attributes).to include(
          'target_amount_unit' => 'mg', 'target_amount_value' => 76.09596,
        )
        expect(s2.attributes).to include(
          'target_amount_unit' => 'mg', 'target_amount_value' => 99.08404,
        )
      end

      it 'materials associations and reassign to a new group' do
        sa1 = r.reactions_starting_material_samples
               .find_by(sample_id: sample1.id)
        sa2 = r.reactions_starting_material_samples
               .find_by(sample_id: sample2.id)
        sa2_eq = (sa2.sample.amount_mmol / sa1.sample.amount_mmol).round(14)
        expect(sa1.attributes).to include(
          'reference' => true, 'equivalent' => 1.0,
        )
        expect(sa2.attributes).to include('reference' => false)
        expect(sa2.equivalent.round(14)).to eq(sa2_eq)
        expect(r.reactions_reactant_samples).to be_empty
      end

      it 'deletes only not included samples' do
        expect(
          r.reactions_product_samples.find_by(sample_id: sample3.id),
        ).to be_present
        expect(
          r.reactions_product_samples.find_by(sample_id: sample4.id),
        ).not_to be_present
      end
    end

    context 'when creating new materials' do
      let(:params) do
        {
          'id' => reaction1.id,
          'name' => 'new name',
          'container' => new_root_container,
          'materials' => {
            'starting_materials' => [
              {
                'id' => sample1.id,
                'target_amount_unit' => 'mg',
                'target_amount_value' => 76.09596,
                'equivalent' => 1,
                'reference' => false,
                'is_new' => false,
              },
              {
                'id' => sample2.id,
                'amount_unit' => 'mg',
                'amount_value' => 99.08404,
                'equivalent' => 5.5,
                'reference' => false,
                'is_new' => false,
                'container' => new_root_container,
              },
            ],
            'products' => [
              'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
              'name' => 'New Subsample 1',
              'target_amount_unit' => 'mg',
              'target_amount_value' => 76.09596,
              'parent_id' => sample1.id,
              'reference' => true,
              'equivalent' => 1,
              'is_new' => true,
              'is_split' => true,
              'molfile' => Rails.root.join('spec/fixtures/test_2.mol').read,
              'container' => new_root_container,
            ],
          },
        }
      end
      let(:r) { Reaction.find(reaction1.id) }

      before do
        put("/api/v1/reactions/#{reaction1.id}.json",
            params: params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' })
      end

      it 'creates subsamples' do
        subsample = r.products.last
        expect(subsample.parent).to eq(sample1)
        expect(subsample.attributes).to include(
          'target_amount_value' => 76.09596,
          'target_amount_unit' => 'mg',
        )
        subsample_association = r.reactions_product_samples
                                 .find_by(sample_id: subsample.id)
        expect(subsample_association.attributes).to include(
          'reference' => true, 'equivalent' => 1,
        )
      end
    end
  end

  describe 'POST /api/v1/reactions' do
    let(:collection1) do
      Collection.create!(label: 'Collection #1', user: user)
    end
    let(:sample1) do
      create(
        :sample, name: 'Sample 1', container: create(:container)
      )
    end
    let(:molfile_1) { sample1.molecule.molfile }

    context 'when adding reaction to synced collection' do
      let(:receiver) { create(:person, name: 'receiver') }
      let(:collection) { create(:collection, user_id: user.id) }
      let(:sync_collection) do
        create(:sync_collections_user, collection_id: collection.id, sharer: user, user: receiver)
      end
      let(:params) do
        {
          'collection_id' => sync_collection.id,
          'container' => new_root_container,
          'literatures' => {
            'foo' => { 'title' => 'Foo', 'url' => 'foo.com' },
          },
          'origin' => { 'short_label' => 'bar' },
          'materials' => {
            'products' => [
              'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
              'name' => 'New Subsample 1',
              'target_amount_unit' => 'mg',
              'target_amount_value' => 76.09596,
              'parent_id' => sample1.id,
              'reference' => true,
              'equivalent' => 1,
              'is_new' => true,
              'is_split' => true,
              'molfile' => Rails.root.join('spec/fixtures/test_2.mol').read,
              'molecule' => { molfile: molfile_1 },
              'container' => new_root_container,
            ],
          },
        }
      end

      before do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(receiver) # log in as receiver
        post('/api/v1/reactions.json',
             params: params.to_json,
             headers: { 'CONTENT_TYPE' => 'application/json' })
      end

      it 'links reaction to collection' do
        reaction_id = JSON.parse(response.body)['reaction']['id']
        match = CollectionsReaction.where(collection_id: collection.id, reaction_id: reaction_id).first
        expect(match).not_to be_nil
      end
    end

    context 'when creating new materials' do
      let(:params) do
        {
          'name' => 'r001',
          'collection_id' => collection1.id,
          'container' => new_root_container,
          'materials' => {
            'products' => [
              'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335',
              'name' => 'New Subsample 1',
              'target_amount_unit' => 'mg',
              'target_amount_value' => 76.09596,
              'parent_id' => sample1.id,
              'reference' => true,
              'equivalent' => 1,
              'is_new' => true,
              'is_split' => true,
              'molfile' => Rails.root.join('spec/fixtures/test_2.mol').read,
              'molecule' => { molfile: molfile_1 },
              'container' => new_root_container,
            ],
            'reactants' => [
              'id' => 'd4ca4ec0-6d8e-11e5-b2f1-c9913eb3e336',
              'name' => 'Copied Sample',
              'solvent' => [{ label: 'Acetone', smiles: 'CC(C)=O', ratio: '100' }],
              'target_amount_unit' => 'mg',
              'target_amount_value' => 86.09596,
              'reference' => false,
              'equivalent' => 2,
              'is_new' => true,
              'is_split' => false,
              'molfile' => molfile_1,
              'container' => new_root_container,
            ],
          },
        }
      end
      let(:r) { Reaction.find_by(name: 'r001') }

      before do
        post('/api/v1/reactions.json',
             params: params.to_json,
             headers: { 'CONTENT_TYPE' => 'application/json' })
      end

      it 'creates subsamples' do
        subsample = r.products.last

        expect(subsample.parent).to eq(sample1)
        expect(subsample.attributes).to include(
          'target_amount_value' => 76.09596,
          'target_amount_unit' => 'mg',
        )

        subsample_association = r.reactions_product_samples
                                 .find_by(sample_id: subsample.id)
        expect(subsample_association.attributes).to include(
          'reference' => true, 'equivalent' => 1,
        )
      end

      it 'creates a copied sample' do
        reactant = r.reactants.last
        expect(reactant.attributes).to include(
          'name' => 'Copied Sample',
          'target_amount_value' => 86.09596,
          'target_amount_unit' => 'mg',
          'solvent' => [{ 'label' => 'Acetone', 'smiles' => 'CC(C)=O', 'ratio' => '100' }],
        )
        reactant_association = r.reactions_reactant_samples
                                .find_by(sample_id: reactant.id)
        expect(reactant_association.attributes).to include(
          'reference' => false, 'equivalent' => 2,
        )
      end
    end

    context 'when creating a copied reaction' do
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
          'children' => [],
        }
      end
      let(:r) { Reaction.last }

      let(:params) do
        {
          'name' => ' Copy',
          'collection_id' => collection1.id,
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
              'container' => new_container,
            ],
          },
        }
      end

      before do
        post '/api/v1/reactions', params: params, as: :json
      end

      it 'create products with name realted to the reaction short_label' do
        product = r.products.first
        expect(product.name).to include(r.short_label)
      end
    end
  end
end
