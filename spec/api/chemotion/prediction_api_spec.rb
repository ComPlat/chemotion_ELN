# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PredictionAPI do
  include_context 'api request authorization context'

  let(:smis) { ['CCO'] }

  describe 'POST /api/v1/prediction/products' do
    before do
      allow(Ai::Inference).to receive(:products).and_return([])
    end

    context 'when the reactionPrediction feature is not enabled for the user' do
      before do
        create(:matrice, name: 'reactionPrediction', enabled: false)
        user.reload
        post '/api/v1/prediction/products', params: { smis: smis }
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end

      it 'does not call the inference service' do
        expect(Ai::Inference).not_to have_received(:products)
      end
    end

    context 'when the reactionPrediction feature does not exist' do
      before do
        post '/api/v1/prediction/products', params: { smis: smis }
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the reactionPrediction feature is enabled for the user' do
      before do
        create(:matrice, name: 'reactionPrediction', enabled: true)
        user.reload
        post '/api/v1/prediction/products', params: { smis: smis }
      end

      it 'calls the inference service' do
        expect(response).to have_http_status(:created)
        expect(Ai::Inference).to have_received(:products).with(smis)
      end
    end
  end

  describe 'POST /api/v1/prediction/reactants' do
    before do
      allow(Ai::Inference).to receive(:reactants).and_return([])
      create(:matrice, name: 'reactionPrediction', enabled: false)
      user.reload
      post '/api/v1/prediction/reactants', params: { smis: smis }
    end

    it 'returns 401 unauthorized when the feature is not enabled for the user' do
      expect(response).to have_http_status(:unauthorized)
      expect(Ai::Inference).not_to have_received(:reactants)
    end
  end
end
