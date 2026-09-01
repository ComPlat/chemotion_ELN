# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SampleAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:reaction) { create(:reaction, collections: [collection]) }
  let(:molecule) { create(:molecule) }

  # Creates a product sample, places it in a collection, and links it to a reaction.
  def product(real_value, real_unit, mol, in_collection: collection, in_reaction: reaction)
    sample = create(
      :sample,
      collections: [in_collection],
      molecule: mol,
      purity: 1.0,
      real_amount_value: real_value,
      real_amount_unit: real_unit,
    )
    create(:reactions_product_sample, reaction: in_reaction, sample: sample)
    sample
  end

  describe 'POST /api/v1/samples/merge' do
    let(:source) { product(2.0, 'mol', molecule) }
    let(:target) { product(3.0, 'mol', molecule) }

    def merge_request(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
      post '/api/v1/samples/merge',
           params: { source_sample_id: source_id, target_sample_id: target_id, reaction_id: reaction_id },
           as: :json
    end

    it 'merges and returns the updated target' do
      merge_request

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)['sample']['id']).to eq(target.id)
    end

    context 'when merging reactants' do
      def reactant(real_value, real_unit, mol)
        sample = create(
          :sample,
          collections: [collection],
          molecule: mol,
          purity: 1.0,
          real_amount_value: real_value,
          real_amount_unit: real_unit,
        )
        create(:reactions_reactant_sample, reaction: reaction, sample: sample)
        sample
      end

      let(:source) { reactant(2.0, 'mol', molecule) }
      let(:target) { reactant(3.0, 'mol', molecule) }

      it 'merges and returns the updated target' do
        merge_request

        expect(response).to have_http_status(:created)
        expect(JSON.parse(response.body)['sample']['id']).to eq(target.id)
      end
    end

    it 'returns 422 when the structures differ' do
      different_source = product(1.0, 'mol', create(:molecule))
      merge_request(source_id: different_source.id)

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'returns 404 when a sample is missing' do
      merge_request(source_id: 0)

      expect(response).to have_http_status(:not_found)
    end

    it 'returns 401 when the user cannot access the reaction' do
      foreign_collection = create(:collection, user: create(:person))
      foreign_reaction = create(:reaction, collections: [foreign_collection])
      foreign_source = product(1.0, 'mol', molecule, in_collection: foreign_collection, in_reaction: foreign_reaction)
      foreign_target = product(1.0, 'mol', molecule, in_collection: foreign_collection, in_reaction: foreign_reaction)

      post '/api/v1/samples/merge',
           params: {
             source_sample_id: foreign_source.id,
             target_sample_id: foreign_target.id,
             reaction_id: foreign_reaction.id,
           },
           as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'DELETE /api/v1/samples/merge/:id' do
    let(:source) { product(2.0, 'mol', molecule) }
    let(:target) { product(3.0, 'mol', molecule) }

    before do
      SampleMergeService.new(current_user: user).merge!(
        source_id: source.id, target_id: target.id, reaction_id: reaction.id,
      )
    end

    it 'unmerges and revives the source' do
      delete "/api/v1/samples/merge/#{SampleMerge.last.id}", as: :json

      expect(response).to have_http_status(:ok)
      expect(source.reload.is_legacy).to be false
    end

    it 'returns 404 for an unknown merge id' do
      delete '/api/v1/samples/merge/0', as: :json

      expect(response).to have_http_status(:not_found)
    end
  end
end
