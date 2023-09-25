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
        @cell_line_sample = @current_user.cellline_samples.find_by(id: @params[:cell_line_sample_id])
        @cell_line_sample ||= fetch_cell_lines_from_shared_sync
        raise 'no cell line sample found ' unless @cell_line_sample

        @cell_line_sample.cellline_material = find_material || create_new_material
        update_sample_properties
        update_material_properties(@cell_line_sample.cellline_material)
        @cell_line_sample.save
        @cell_line_sample
      end

      def find_material
        CelllineMaterial.find_by(
          name: @params[:material_names],
          source: @params[:source],
        )
      end

      def fetch_cell_lines_from_shared_sync
        shared_or_synced_celllines = @current_user.shared_collections.map do |col|
          sync_collection_user = col.sync_collections_users.find_by(
            collection_id: col.id,
            user_id: @current_user.id,
          )
          return [] if sync_collection_user.permission_level.zero?

          col.cellline_samples.find_by(id: @params[:cell_line_sample_id])
        end
        shared_or_synced_celllines.first
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
