# frozen_string_literal: true

module Usecases
  module CellLines
    class Load
      def initialize(id, current_user)
        @current_user = current_user
        @id = id
      end

      def execute!
        raise 'user is not valid' unless @current_user&.cellline_samples
        raise 'id not valid' unless @id.is_a?(Numeric) && @id.positive?

        begin
          cell_line_sample = @current_user.cellline_samples.find(@id)
        rescue StandardError
          raise 'user has no access to object'
        end

        cell_line_sample
      end
    end
  end
end
