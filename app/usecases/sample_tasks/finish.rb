# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Finish
      attr_reader :sample_task, :user

      def initialize(sample_task:, user:)
        @sample_task = sample_task
        @user = user
      end

      def perform!
        calculate_result_value
        transfer_measurement_to_sample
      end

      def sample_task_can_be_finished?
        all_scan_results_present = sample_task.scan_results.length == sample_task.required_scan_results
        sample_task_unfinished = sample_task.result_value.nil?
        sample_present = sample_task.sample.present?

        sample_task_unfinished && all_scan_results_present && sample_present
      end

      private

      def transfer_measurement_to_sample
        return unless sample_task.sample

        sample_task.sample.update!(
          real_amount_value: sample_task.result_value,
          real_amount_unit: sample_task.result_unit,
        )
      end

      def calculate_result_value
        if sample_task.required_scan_results == 1
          sample_task.update!(
            result_value: sample_task.scan_results.first.measurement_value,
            result_unit: sample_task.scan_results.first.measurement_unit,
          )
        else
          vessel_scan = sample_task.scan_results.first
          vessel_plus_compound_scan = sample_task.scan_results.last
          calculation_result = vessel_plus_compound_scan - vessel_scan

          sample_task.update!(
            result_value: calculation_result.measurement_value,
            result_unit: calculation_result.measurement_unit,
          )
        end
      end
    end
  end
end
