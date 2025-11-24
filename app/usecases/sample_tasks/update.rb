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
        sample_id = sample.id if params[:sample_id]
        sample_task.update!(
          description: params[:description],
          sample_id: sample_id,
        )
      end

      private

      def sample
        Sample.find(params[:sample_id]).tap do |sample|
          raise ActiveRecord::RecordNotFound unless ElementPolicy.new(user, sample).read?
        end
      end
    end
  end
end
