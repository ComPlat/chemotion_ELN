module Chemotion
  class SampleAPI < Grape::API
    # TODO ensure user is authenticated

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

      desc "Update sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
        requires :name, type: String, desc: "Sample name"
      end
      put ':id' do
        Sample.find(params[:id]).update({
          name: params[:name]
        })
      end
    end
  end
end
