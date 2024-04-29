# frozen_string_literal: true

module Usecases
  module CellLines
    class Copy
      def initialize(cell_line_sample_to_copy, current_user)
        @current_user = current_user
        @cell_line_sample_to_copy = cell_line_sample_to_copy
      end

      def execute!
        copy_cellline_sample
      end

      def copy_cellline_sample
        CelllineSample.create(
          cellline_material: @cell_line_sample_to_copy.cellline_material,
          creator: @current_user,
          amount: @cell_line_sample_to_copy[:amount],
          unit: @cell_line_sample_to_copy[:unit],
          passage: @cell_line_sample_to_copy[:passage],
          contamination: @cell_line_sample_to_copy[:contamination],
          name: @cell_line_sample_to_copy[:name],
          description: @cell_line_sample_to_copy[:description],
        )
      end

    end
  end
end
