# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Create
      attr_accessor :params, :user, :sample

      def initialize(params:, user:)
        @params = params
        @user = user
        @sample = user_accessible_samples.find(params[:sample_id]) if params[:sample_id]
      end

      def perform!
        SampleTask.create!(
          creator: user,
          description: params[:description] || default_description,
          required_scan_results: params[:required_scan_results],
          sample_id: sample&.id,
        )
      end

      private

      def default_description
        description = "Scan Task from #{DateTime.current}"
        description += " for #{sample.showed_name}" if sample

        description
      end

      # This encapsulates the logic which samples a given user can access.
      # As in the near future the logic for shared/synched collections will change, it is feasible to extract
      # this into its own method, even if currently there is only dummy logic used
      def user_accessible_samples
        user.samples
      end
    end
  end
end
