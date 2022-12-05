# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Create
      attr_accessor :params, :user

      def initialize(params:, user:)
        @params = params
        @user = user
      end

      def create_open_sample_task
        sample = user_accessible_samples.find(params[:sample_id])

        SampleTask.create!(creator: user, sample: sample)
      end

      def create_open_free_scan # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
        sample_task = SampleTask.create!(
          creator: user,
          measurement_value: params[:measurement_value],
          measurement_unit: params[:measurement_unit],
          description: params[:description],
          additional_note: params[:additional_note],
          private_note: params[:private_note],
          attachment_attributes: {
            filename: params[:file][:filename],
            content_type: params[:file][:type],
            file_path: params[:file][:tempfile].path,
            created_by: user.id,
          },
        )

        sample_task.attachment.save!
        sample_task
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
