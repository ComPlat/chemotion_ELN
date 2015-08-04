module Chemotion
  class SampleAPI < Grape::API
    resource :samples do
      desc "Return serialized sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        get do
          Sample.find(params[:id])
        end
      end
    end
  end
end
