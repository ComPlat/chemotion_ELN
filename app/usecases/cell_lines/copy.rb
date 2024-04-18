# frozen_string_literal: true

module Usecases
  module CellLines
    class Copy
      def initialize(cell_line_sample_to_copy, current_user)
        @current_user = current_user
        @cell_line_sample_to_copy = cell_line_sample_to_copy
      end

      def execute!
        create_cellline_sample(@cell_line_sample_to_copy.cellline_material)
      end

      # TODO: REMOVE REDUNDANT FUNCTION
      def create_cellline_sample(material)
        CelllineSample.create(
          # cellline_material: material,
          # creator: @current_user,
          # amount: @params[:amount],
          # unit: @params[:unit],
          # passage: @params[:passage],
          # contamination: @params[:contamination],
          # name: @params[:name],
          # description: @params[:description],
          # short_label: @params[:short_label],
        )
      end
    end
  end
end
