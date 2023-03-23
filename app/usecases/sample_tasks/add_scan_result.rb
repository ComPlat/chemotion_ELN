# frozen_string_literal: true

module Usecases
  module SampleTasks
    class AddScanResult
      attr_reader :params, :user, :sample_task

      def initialize(user:, sample_task:, params: {})
        @params = params
        @user = user
        @sample_task = sample_task
      end

      def perform!
        sample_task.scan_results.create(
          attachment_attributes: attachment_attributes,
          measurement_unit: params[:measurement_unit],
          measurement_value: params[:measurement_value],
          position: sample_task.scan_results.length + 1,
          title: params[:title] || default_title,
        )
      end

      private

      def attachment_attributes
        {
          filename: params[:file][:filename],
          content_type: Marcel::MimeType.for(Pathname.new(params[:file][:tempfile].path)),
          file_path: params[:file][:tempfile].path,
          created_by: user.id,
          created_for: user.id,
        }
      end

      def default_title
        return 'Compound' if sample_task.required_scan_results == 1

        if sample_task.scan_results.empty? # sample task has no scan results yet
          'Vessel'
        else # sample task already has a scan result for the vessel
          'Vessel + Compound'
        end
      end
    end
  end
end
