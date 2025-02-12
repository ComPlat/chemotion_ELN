# frozen_string_literal: true

module Usecases
  module Wellplates
    class Update
      include UserLabelHelpers
      attr_reader :params

      def initialize(params, user_id)
        @params = params
        @user_id = user_id
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.find(params[:id])
          wellplate.update(params.except(:wells, :segments, :size, :user_labels))
          WellplateUpdater
            .new(wellplate: wellplate, current_user: User.find(@user_id))
            .update_wells(well_data: params[:wells])
          wellplate.touch
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @user_id)
          update_element_labels(wellplate, params[:user_labels], @user_id)
          wellplate
        end
      end
    end
  end
end
