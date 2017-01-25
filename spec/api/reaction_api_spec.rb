require 'rails_helper'

describe Chemotion::ReactionAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    let(:new_container) {{
      "name" => "new",
      "attachments" => [],
      "is_deleted" => false,
      "is_new" => true,
      "description" => "",
      "container_type" => "root",
      "extended_metadata" => { "report" => true },
      "children" => [{
        "name" => "new",
        "attachments" => [],
        "is_deleted" => false,
        "is_new" => true,
        "description" => "",
        "container_type" => "analyses",
        "extended_metadata" => { "report" => true },
        "children" => []
      }],
    }}

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/reactions' do
      let(:c1)   { create(:collection, label: 'C1', user: user, is_shared: false) }
      let(:r1)   { create(:reaction, name:'r1')}#,collections: [c1]) }
      let(:r2)   { create(:reaction, name:'r2')}#,collections: [c1]) }

      before do
        CollectionsReaction.create!(reaction: r1, collection: c1)
        CollectionsReaction.create!(reaction: r2, collection: c1)
        get '/api/v1/reactions'
      end

      it 'returns serialized (unshared) reactions roots of logged in user' do
        reactions = JSON.parse(response.body)['reactions']
        expect(reactions.map{|r| [r['id'],r['name']]}).to match_array([
          [r1.id,r1.name], [r2.id,r2.name]])
        expect(reactions.first.symbolize_keys).to include(
          id: r2.id,
          name: r2.name,
          type: 'reaction',
          collection_labels: [{
            "name" => 'C1', "is_shared" => false,
            "id" => c1.id, "user_id" => user.id,
            "shared_by_id" => c1.shared_by_id,
            "is_synchronized" => c1.is_synchronized
          }]
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
        let(:c1) { create(:collection, user_id: user.id) }
        let(:r1) {create(:reaction, name: 'test', created_by: user.id)}
        let(:params) {{ id: r1.id, collection_id: c1.id }}
        before do
          CollectionsReaction.create(reaction_id: r1.id, collection_id: c1.id)
          delete "/api/v1/reactions/#{r1.id}", params
        end
        it 'should be able to delete a reaction' do
          reaction_id = r1.id
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
            collection_id: c1.id,
            included_ids: [reaction_1.id, reaction_2.id],
            excluded_ids: []
          }
        }

        let!(:params_all_true) {
          {
            all: true,
            collection_id: c1.id,
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

        it 'should be able to delete reactions when "all" is true' do
          old_reaction_ids = [reaction_1.id, reaction_2.id]
          delete '/api/v1/reactions/ui_state/', { ui_state: params_all_true }

          expect(Reaction.where(id: old_reaction_ids)).to eq []
        end

      end
    end

    describe 'PUT /api/v1/reactions', focus: true do

      let(:collection_1) { Collection.create!(label: 'Collection #1', user: user) }
      let(:sample_1) {create(:sample, name:'Sample 1')}
      let(:sample_2) {create(:sample, name:'Sample 2')}
      let(:sample_3) {create(:sample, name:'Sample 3')}
      let(:sample_4) {create(:sample, name:'Sample 4')}

      let(:reaction_1) {create(:reaction, name:'r1')}
      let (:reaction_container) {{
        "name" => "new",
        "attachments" => [],
        "is_deleted" => false,
        "is_new" => false,
        "containable_type" => "Reaction",
        "containable_id" => reaction_1.id,
        "description" => "",
        "container_type" => "root",
        "extended_metadata" => {},
        "children" => [],
      }}

      before do
        CollectionsReaction.create(reaction_id: reaction_1.id, collection_id: collection_1.id)
        ReactionsStartingMaterialSample.create!(reaction: reaction_1, sample: sample_1, reference: true, equivalent: 1)
        ReactionsReactantSample.create!(reaction: reaction_1, sample: sample_2, equivalent: 2)
        ReactionsProductSample.create!(reaction: reaction_1, sample: sample_3, equivalent: 1)
        ReactionsProductSample.create!(reaction: reaction_1, sample: sample_4, equivalent: 1)
      end

      context 'updating and reassigning existing materials' do
        let(:params) {{
          "id" => reaction_1.id,
          "name" => "new name",
          "container" => reaction_container,
          "materials" => {
            "starting_materials" => [
              {
                "id" => sample_1.id,
                "target_amount_unit" => "mg",
                "target_amount_value" => 76.09596,
                "equivalent" => 1,
                "reference" => true,
                "is_new" => false
              },
              {
                "id" => sample_2.id,
                "target_amount_unit" => "mg",
                "target_amount_value" => 99.08404,
                "equivalent" => 5.5,
                "reference" => false,
                "is_new" => false
              }
            ],
            "products" => [
              {
                "id" => sample_3.id,
                "target_amount_unit" => "mg",
                "target_amount_value" => 99.08404,
                "equivalent" => 5.5,
                "reference" => false,
                "is_new" => false
              }
            ]
          }
        }}

        before do
          put "/api/v1/reactions/#{reaction_1.id}", params
        end

        let(:r) { Reaction.find(reaction_1.id) }

        it 'should update the reaction attributes' do
          expect(r.name).to eq('new name')
        end

        it 'should update the sample attributes' do
          s1 = r.starting_materials.find(sample_1.id)
          s2 = r.starting_materials.find(sample_2.id)

          expect(s1.attributes).to include({
            "target_amount_unit" => "mg",
            "target_amount_value" => 76.09596,
          })

          expect(s2.attributes).to include({
            "target_amount_unit" => "mg",
            "target_amount_value" => 99.08404,
          })
        end

        it 'should material associations and reassign to a new group' do
          sa1 = r.reactions_starting_material_samples.find_by(sample_id: sample_1.id)
          sa2 = r.reactions_starting_material_samples.find_by(sample_id: sample_2.id)

          expect(sa1.attributes).to include({
            "reference" => true,
            "equivalent" => 1.0
          })

          expect(sa2.attributes).to include({
            "reference" => false,
            "equivalent" => 5.5
          })

          expect(r.reactions_reactant_samples).to be_empty
        end

        it 'should delete only not included samples' do
          expect(r.reactions_product_samples.find_by(sample_id: sample_3.id)).to be_present
          expect(r.reactions_product_samples.find_by(sample_id: sample_4.id)).not_to be_present
        end

      end

      context 'creating new materials' do
        let(:params) {
          {
            "id" => reaction_1.id,
            "name" => "new name",
            "container" => new_container,
            "materials" => {
              "starting_materials" => [
                {
                  "id" => sample_1.id,
                  "target_amount_unit" => "mg",
                  "target_amount_value" => 76.09596,
                  "equivalent" => 1,
                  "reference" => false,
                  "is_new" => false
                },
                {
                  "id" => sample_2.id,
                  "amount_unit" => "mg",
                  "amount_value" => 99.08404,
                  "equivalent" => 5.5,
                  "reference" => false,
                  "is_new" => false,
                  "container" => new_container
                }
              ],
              "products" => [
                "id" => "d4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335",
                "name" => "New Subsample 1",
                "target_amount_unit" => "mg",
                "target_amount_value" => 76.09596,
                "parent_id" => sample_1.id,
                "reference" => true,
                "equivalent" => 1,
                "is_new" => true,
                "is_split" => true,
                "container" => new_container
              ]
            }
          }
        }

        before do
          put "/api/v1/reactions/#{reaction_1.id}", params
        end

        let(:r) { Reaction.find(reaction_1.id) }

        it 'should create subsamples' do

          subsample = r.products.last

          expect(subsample.parent).to eq(sample_1)
          expect(subsample.attributes).to include(
            {
              "name" => sample_1.name,
              "target_amount_value" => 76.09596,
              "target_amount_unit" => "mg",
            }
          )

          subsample_association = r.reactions_product_samples.find_by(sample_id: subsample.id)
          expect(subsample_association.attributes).to include({
            "reference" => true,
            "equivalent" => 1
          })

        end

      end
    end

    describe 'POST /api/v1/reactions', focus: true do
      let(:collection_1) { Collection.create!(label: 'Collection #1', user: user) }
      let(:sample_1) {
        create(:sample, name:'Sample 1', container: FactoryGirl.create(:container))
      }

      context 'creating new materials' do
        let(:params) {
          {
            "name" => "r001",
            "collection_id" => collection_1.id,
            "container" => new_container,
            "materials" => {
              "products" => [
                "id" => "d4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335",
                "name" => "New Subsample 1",
                "target_amount_unit" => "mg",
                "target_amount_value" => 76.09596,
                "parent_id" => sample_1.id,
                "reference" => true,
                "equivalent" => 1,
                "is_new" => true,
                "is_split" => true,
                "molecule" => {molfile: ""},
                "container" => new_container,
              ],
              "reactants" => [
                "id" => "d4ca4ec0-6d8e-11e5-b2f1-c9913eb3e336",
                "name" => "Copied Sample",
                "solvent" => "solvent1",
                "target_amount_unit" => "mg",
                "target_amount_value" => 86.09596,
                "parent_id" => sample_1.id,
                "reference" => false,
                "equivalent" => 2,
                "is_new" => true,
                "is_split" => false,
                "molecule" => {molfile: ""},
                "container" => new_container,
              ]
            }
          }
        }

        before do
          post "/api/v1/reactions", params
        end

        let(:r) { Reaction.find_by(name: 'r001') }

        it 'should create subsamples' do
          subsample = r.products.last

          expect(subsample.parent).to eq(sample_1)
          expect(subsample.attributes).to include(
            {
              "name" => sample_1.name,
              "target_amount_value" => 76.09596,
              "target_amount_unit" => "mg"
            }
          )

          subsample_association = r.reactions_product_samples.find_by(sample_id: subsample.id)
          expect(subsample_association.attributes).to include({
            "reference" => true,
            "equivalent" => 1
          })

        end

        it 'should created a copied sample' do

          reactant = r.reactants.last

          expect(reactant.attributes).to include(
            {
              "name" => "Copied Sample",
              "target_amount_value" => 86.09596,
              "target_amount_unit" => "mg",
              "solvent" => "solvent1"
            }
          )

          reactant_association = r.reactions_reactant_samples.find_by(sample_id: reactant.id)
          expect(reactant_association.attributes).to include({
            "reference" => false,
            "equivalent" => 2
          })
        end

      end

      context 'creating a copied reaction' do
        let(:params) {
          {
            "name" => " Copy",
            "collection_id" => collection_1.id,
            "materials" => {
              "products" => [
                         "id" => "d4ca4ec0-6d8e-11e5-b2f1-c9913eb3e335",
                       "name" => "JHX-1-A",
                "target_amount_unit" => "mg",
               "target_amount_value" => 76.09596,
                  "reference" => true,
                 "equivalent" => 1,
                     "is_new" => true,
                   "is_split" => true,
                   "molecule" => {molfile: ""}
              ]
            }
          }
        }

        before do
          post "/api/v1/reactions", params
        end

        let(:r) { Reaction.last }

        it 'create products with name realted to teh reaction short_label' do
          product = r.products.first
          expect(product.name).to include(r.short_label)
        end
      end
    end
  end
end
