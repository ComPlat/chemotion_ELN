module Chemotion
  class SampleAPI < Grape::API
    # TODO ensure user is authenticated

    resource :samples do

      #todo: more general search api
      desc "Return serialized samples"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      get do
        if(params[:collection_id])
          current_user.collections.find(params[:collection_id]).samples
        else
          Sample.all
        end
      end

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
        requires :amount_value, type: Float, desc: "Sample amount_value"
        requires :amount_unit, type: String, desc: "Sample amount_unit"
        requires :description, type: String, desc: "Sample description"
      end
      put ':id' do
        Sample.find(params[:id]).update({
          name: params[:name],
          amount_value: params[:amount_value],
          amount_unit: params[:amount_unit],
          description: params[:description]
        })
      end


    end
  end
end
