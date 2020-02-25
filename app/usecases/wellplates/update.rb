# frozen_string_literal: true

module Usecases
  module Wellplates
    class Update
      attr_reader :params

      def initialize(params)
        @params = params
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.find(params[:id])
          wellplate.update(params.except(:wells))
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate.touch
          wellplate.reload
          wellplate
        end
      end
    end
  end
end
