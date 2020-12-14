# frozen_string_literal: true

module Usecases
  module Wellplates
    class Update
      attr_reader :params

      def initialize(params, user_id)
        @params = params
        @user_id = user_id
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.find(params[:id])
          wellplate.update(params.except(:wells, :segments))
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate.touch
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @user_id)
          wellplate
        end
      end
    end
  end
end
