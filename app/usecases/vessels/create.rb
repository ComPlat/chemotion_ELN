# frozen_string_literal: true

module Usecases
  module Vessels
    class Create
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        check_parameter
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

      # rubocop: disable Lint/UnusedMethodArgument
      def create_vessel(template)
        Vessel.create(
          vessel_template: template,
          creator: @current_user,
          name: @params[:name],
          description: @params[:description],
        )
      end
      # rubocop: enable Lint/UnusedMethodArgument

      def check_parameter
        raise 'volume_amount not valid' unless check_scalar_value(@params[:volume_amount])
        raise 'template_name not valid' unless check_string_value(@params[:template_name])
        raise 'volume_unit not valid' unless check_string_value(@params[:volume_unit])
        raise 'vessel_type not valid' unless check_string_value(@params[:vessel_type])
        raise 'material_type not valid' unless check_string_value(@params[:material_type])
      end

      def check_scalar_value(value)
        value.instance_of?(Integer) && value >= 0
      end

      def check_string_value(value)
        value.instance_of?(String) && !value.empty?
      end
    end
  end
end
