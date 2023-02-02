# frozen_string_literal: true

module Usecases
  module SampleTasks
    class AddScanResult
      attr_reader :params, :user, :sample_task

      def initialize(params: {}, user:, sample_task:)
        @params = params
        @user = user
        @sample_task = sample_task
      end

      def perform!
        scan_result = sample_task.scan_results.create(
          attachment_attributes: {
            filename: params[:file][:filename],
            content_type: params[:file][:type],
            file_path: params[:file][:tempfile].path,
            created_by: user.id
          },
          measurement_unit: params[:measurement_unit],
          measurement_value: params[:measurement_value],
          position: sample_task.scan_results.length + 1
        )
      end
    end
  end
end
