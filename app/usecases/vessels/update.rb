# frozen_string_literal: true

module Usecases
  module Vessels
    class Update
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        @vessel = @current_user.vessels.find(@params[:vessel_id])
        raise 'no vessel found' unless @vessel

        @template = @vessel.vessel_template
        @vessel.vessel_template = find_vessel_template || create_vessel_template

        update_vessel_properties
        update_template_properties(@template)

        @vessel.save
        @vessel
      end

      def find_vessel_template
        VesselTemplate.find_by(
          name: @params[:template_name] || @template.name,
          details: @params[:details] || @template.details,
          vessel_type: @params[:vessel_type] || @template.vessel_type,
          volume_unit: @params[:volume_unit] || @template.volume_unit,
          volume_amount: @params[:volume_amount] || @template.volume_amount,
          material_type: @params[:material_type] || @template.material_type,
          material_details: @params[:material_details] || @template.material_details,
          )
      end

      def create_vessel_template
        VesselTemplate.create(
          name: @params[:template_name] || @template.name,
          details: @params[:details] || @template.details,
          vessel_type: @params[:vessel_type] || @template.vessel_type,
          volume_unit: @params[:volume_unit] || @template.volume_unit,
          volume_amount: @params[:volume_amount] || @template.volume_amount,
          material_type: @params[:material_type] || @template.material_type,
          material_details: @params[:material_details] || @template.material_details,
          )
      end

      def update_vessel_properties
        @vessel.name = @params[:name] || @vessel.name
        @vessel.description = @params[:description] || @vessel.description
      end

      def update_template_properties(template)
        template.name = @params[:template_name]
        template.details = @params[:details]
        template.vessel_type = @params[:vessel_type]
        template.volume_unit = @params[:volume_unit]
        template.volume_amount = @params[:volume_amount]
        template.material_type = @params[:material_type]
        template.material_details = @params[:material_details]

        template.save
      end
    end
  end
end