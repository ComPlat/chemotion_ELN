module Chemotion
  class PredictionAPI < Grape::API
    before do
      return 401 unless current_user.matrix_check_by_name("reactionPrediction")
    end

    resource :prediction do
      resource :products do
        desc 'Forward reaction prediction'
        params do
          optional :smis, type: Array[String]
        end
        post do
          smis = params[:smis]
          Ai::Inference.products(smis)
        end
      end

      resource :reactants do
        desc 'Retro reaction prediction'
        params do
          optional :smis, type: Array[String]
        end
        post do
          smis = params[:smis]
          Ai::Inference.reactants(smis)
        end
      end
    end
  end
end
