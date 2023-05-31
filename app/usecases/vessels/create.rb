# frozen_string_literal: true

module Usecases
  module Vessels
    class Create
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        @vessel_template = find_vessel_template || create_vessel_template
        @vessel = create_vessel(@vessel_template)

        CollectionsVessel.create(
          collection: Collection.find(@params[:collection_id]),
          vessel: @vessel,
        )

        @vessel
      end

      def find_vessel_template
        VesselTemplate.find_by(
          name: @params[:template_name],
          details: @params[:details],
          vessel_type: @params[:vessel_type],
          volume_unit: @params[:volume_unit],
          volume_amount: @params[:volume_amount],
          material_type: @params[:material_type],
          material_details: @params[:material_details],
        )
      end

      def create_vessel_template
        VesselTemplate.create(
          name: @params[:template_name],
          details: @params[:details],
          vessel_type: @params[:vessel_type],
          volume_unit: @params[:volume_unit],
          volume_amount: @params[:volume_amount],
          material_type: @params[:material_type],
          material_details: @params[:material_details],
        )
      end

      def create_vessel(template)
        Vessel.create(
          vessel_template: @vessel_template,
          creator: @current_user,
          name: @params[:name],
          description: @params[:description],
        )
      end
    end
  end
end