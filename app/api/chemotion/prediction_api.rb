module Chemotion
  class PredictionAPI < Grape::API

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
    end
  end
end
