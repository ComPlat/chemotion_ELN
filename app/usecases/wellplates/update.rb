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
          # Same row lock Usecases::Wellplates::Resize takes. Its occupied-well
          # guard only holds if the well-editing path serialises against it:
          # otherwise a sample placed here between that guard and its delete is
          # destroyed by a concurrent shrink.
          wellplate.lock!
          # width/height are not declared on the update endpoint; excluding them
          # here as well keeps a future param addition from silently resizing the
          # grid behind Usecases::Wellplates::Resize's guard.
          wellplate.update(params.except(:wells, :segments, :size, :user_labels, :width, :height))
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
