# frozen_string_literal: true

module Usecases
  module Vessels
    class Load
      def initialize(id, current_user)
        @current_user = current_user
        @id = id
      end

      def execute!
        raise 'user is not valid' unless @current_user&.vessels
        raise 'id is not valid' unless @id.is_a?(Numeric) && @id.positive?

        begin
          vessel = @current_user.vessels.find(@id)
        rescue StandardError
          raise 'user has no access to object'
        end

        vessel
      end
    end
  end
end
