# frozen_string_literal: true

module Usecases
  module CellLines
    class Update
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        check_parameter
        @cell_line_sample = CelllineSample.find(@params[:cell_line_sample_id])
        raise 'no cell line sample found ' unless ElementPolicy.new(@current_user, @cell_line_sample).read?

        @cell_line_sample.cellline_material = find_material || create_new_material
        update_sample_properties
        if @cell_line_sample.cellline_material.created_by.nil? ||
           @cell_line_sample.cellline_material.created_by == @current_user.id
          update_material_properties(@cell_line_sample.cellline_material)
        end
        @cell_line_sample.save
        @cell_line_sample
      end

      def find_material
        CelllineMaterial.find_by(
          name: @params[:material_names],
          source: @params[:source],
        )
      end

      def create_new_material
        CelllineMaterial.create(
          name: @params[:material_names],
          growth_medium: @params[:growth_medium],
          cell_type: @params[:cell_type],
          organism: @params[:organism],
          tissue: @params[:tissue],
          disease: @params[:disease],
          biosafety_level: @params[:biosafety_level],
          variant: @params[:variant],
          mutation: @params[:mutation],
          optimal_growth_temp: @params[:optimal_growth_temp],
          cryo_pres_medium: @params[:cryo_pres_medium],
          gender: @params[:gender],
          description: @params[:material_description],
          source: @params[:source],
        )
      end

      def update_sample_properties
        @cell_line_sample.amount = @params[:amount]
        @cell_line_sample.passage = @params[:passage]
        @cell_line_sample.contamination = @params[:contamination]
        @cell_line_sample.name = @params[:name]
        @cell_line_sample.unit = @params[:unit]
        @cell_line_sample.description = @params[:description]
      end

      def update_material_properties(material) # rubocop:disable Metrics/AbcSize
        material.growth_medium = @params[:growth_medium]
        material.cell_type = @params[:cell_type]
        material.organism = @params[:organism]
        material.tissue = @params[:tissue]
        material.disease = @params[:disease]
        material.mutation = @params[:mutation]
        material.biosafety_level = @params[:biosafety_level]
        material.variant = @params[:variant]
        material.optimal_growth_temp = @params[:optimal_growth_temp]
        material.cryo_pres_medium = @params[:cryo_pres_medium]
        material.gender = @params[:gender]
        material.description = @params[:material_description]

        material.save
      end

      def check_parameter
        raise 'amount not valid' unless  check_scalar_value(@params[:amount])
        raise 'passage not valid' unless check_scalar_value(@params[:passage])
        raise 'unit not valid' unless check_string_value(@params[:unit])
        raise 'source not valid' unless check_string_value(@params[:source])
        raise 'material name not valid' unless  check_names_value(@params[:material_names])
      end

      def check_scalar_value(value)
        value.instance_of?(Integer) && value >= 0
      end

      def check_string_value(value)
        value.instance_of?(String) && !value.empty?
      end

      def check_names_value(value)
        value.instance_of?(String) && !value.empty?
      end
    end
  end
end
