# frozen_string_literal: true

module Usecases
  module CellLines
    class Load
      def initialize(params, current_user)
        @current_user = current_user
        @params = params
      end

      def execute!
        raise unless @current_user.cellline_samples.find(@params[:id])

        CelllineSample.find(@params[:id])
      end
    end
  end
end
