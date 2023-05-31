# frozen_string_literal: true

module Usecases
  module Vessels
    class Load
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        raise unless @current_user.vessels.find(@params[:id])
        
        Vessel.find(@params[:id])
      end
    end
  end
end