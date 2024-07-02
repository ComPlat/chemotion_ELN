# frozen_string_literal: true

module Usecases
  module CellLines
    class Split
      def initialize(cell_line_sample_to_copy, current_user, collection_id)
        @current_user = current_user
        @cell_line_sample_to_copy = cell_line_sample_to_copy
        @collection_id = collection_id
      end

      def execute!
        @copied_cell_line_sample = Usecases::CellLines::Copy.new(@cell_line_sample_to_copy, @current_user,
                                                                 @collection_id).execute!
        decrease_cell_line_counter

        create_ancestry_relationship

        create_short_label

        @copied_cell_line_sample
      end

      private

      def create_ancestry_relationship
        @copied_cell_line_sample.parent = @cell_line_sample_to_copy
        @copied_cell_line_sample.save
      end

      def create_short_label
        next_child_index = @cell_line_sample_to_copy.children.count.to_s
        @copied_cell_line_sample.short_label = "#{@cell_line_sample_to_copy.short_label}-#{next_child_index}"
        @copied_cell_line_sample.save
      end

      def decrease_cell_line_counter
        @current_user.counters['celllines'] = (@current_user.counters['celllines'].to_i - 1).to_s
      end
    end
  end
end
