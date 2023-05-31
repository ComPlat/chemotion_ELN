# frozen_string_literal: true

module Chemotion
  class VesselAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Resource not found', 401)
    end

    resource :vessel do
      desc 'Get a vessel by id'
      params do
        requires :id, type: Integer, desc: 'id of vessel to load'
      end

      get ':id' do
        vessel = Usecases::Vessels::Load.new(params, current_user).execute!
        return present vessel, with: Entities::VesselEntity
      end

      desc 'Create a new vessel'
      params do
        requires :collection_id, type: Integer, desc: "collection id"
        requires :details, type: String, desc: 'Details of vessel template'
        requires :vessel_type, type: String, desc: 'Vessel Type'
        requires :volume_unit, type: String, desc: 'Vessel unit of volume'
        requires :volume_amount, type: String, desc: 'max volume of vessel'
        requires :material_type, type: String, desc: 'vessel material type'
        requires :material_details, type: String, desc: 'vessel material details'
        optional :name, type: String, desc: "Name of vessel"
        optional :description, type: String, desc: "Freeform description of vessel"
      end

      post do
        error!('401 unauthorised', 401) unless current_user.collections.find(params[:collection_id])
        use_case = Usecases::Vessels::Create.new(params, current_user)
        vessel = use_case.execute!
        return present vessel, with: Entities::VesselEntity
      end

      desc 'Update vessel'
      params do
        requires :vessel_id, type: Integer, desc: 'id of vessel to update'
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :details, type: String, desc: 'Details of vessel template'
        optional :vessel_type, type: String, desc: 'Vessel Type'
        optional :volume_unit, type: String, desc: 'Vessel unit of volume'
        optional :volume_amount, type: String, desc: 'max volume of vessel'
        optional :material_type, type: String, desc: 'vessel material type'
        optional :material_details, type: String, desc: 'vessel material details'
        optional :name, type: String, desc: "Name of vessel"
        optional :description, type: String, desc: "Brief description of vessel"
      end

      put do
        use_case = Usecases::Vessels::Update.new(params, current_user)
        vessel = use_case.execute!
        return present vessel, with: Entities::VesselEntity
      end
    end
  end
end