# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Update
      attr_accessor :params, :sample_task, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def perform!
        sample_task = SampleTask.for(user).open.find(params[:id])
        sample_id = nil
        # check permission to update sample
        sample_id = user_accessible_samples.find(params[:sample_id]).id if params[:sample_id]
        sample_task.update!(
          description: params[:description],
          sample_id: sample_id
        )
      end
    end
  end
end
