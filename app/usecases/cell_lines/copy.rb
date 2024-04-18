# frozen_string_literal: true

module Usecases
  module CellLines
    class Copy
      def initialize(cell_line_sample_to_copy, current_user)
        @current_user = current_user
        @cell_line_sample_to_copy = cell_line_sample_to_copy
      end

      def execute!
        1
      end
    end
  end
end
