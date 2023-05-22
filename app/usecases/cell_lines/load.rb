# frozen_string_literal: true

module Usecases
    module CellLines
      class Load
        def initialize(params, current_user)
          @current_user = current_user
          @params = params
        end
  
        def execute!; end
      end
    end
  end