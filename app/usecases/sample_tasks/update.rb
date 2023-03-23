# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Update
      attr_accessor :params, :sample_task, :user

      def initialize(params:, user:)
        @params = params
        @user = user
        @sample_task = SampleTask.for(user).open.find(params[:id])
      end

      def perform!
        sample_id = nil
        # check permission to update sample
        sample_id = user_accessible_samples.find(params[:sample_id]).id if params[:sample_id]
        sample_task.update!(
          description: params[:description],
          sample_id: sample_id,
        )
      end

      private

      # This encapsulates the logic which samples a given user can access.
      # As in the near future the logic for shared/synched collections will change, it is feasible to extract
      # this into its own method, even if currently there is only dummy logic used
      def user_accessible_samples
        user.samples
      end
    end
  end
end
