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
        requires :amount_value, type: Float, desc: "Sample amount_value"
        requires :amount_unit, type: String, desc: "Sample amount_unit"
      end
      put ':id' do
        Sample.find(params[:id]).update({
          name: params[:name],
          amount_value: params[:amount_value],
          amount_unit: params[:amount_unit]
        })
      end
    end
  end
end
