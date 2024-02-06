# frozen_string_literal: true

module Usecases
  module CellLines
    class Load
      def initialize(id, current_user)
        @current_user = current_user
        @id = id
      end

      def execute!
        raise 'user is not valid' unless @current_user
        raise 'id not valid' unless @id.is_a?(Numeric) && @id.positive?

        cell_line_sample = @current_user.cellline_samples.find_by(id: @id)

        cell_line_sample = fetch_cell_lines_from_shared_sync if cell_line_sample.nil?

        raise 'user has no access to object' unless cell_line_sample

        cell_line_sample
      end

      def fetch_cell_lines_from_shared_sync
        shared_or_synced_celllines = @current_user.shared_collections.map do |col|
          col.cellline_samples.find_by(id: @id)
        end
        shared_or_synced_celllines.first
      end
    end
  end
end
