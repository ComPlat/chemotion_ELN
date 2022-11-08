# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Update
      attr_accessor :params, :sample_task, :user

      def initialize(params:, sample_task:, user:)
        @params = params
        @sample_task = sample_task
        @user = user
      end

      def update_sample_task
        if sample_task.sample
          update_with_scan_data
        else
          sample_task.update!(sample_id: params[:sample_id])
        end
      end

      def transfer_measurement_to_sample
        sample_task.sample.update!(
          real_amount_value: sample_task.measurement_value,
          real_amount_unit: sample_task.measurement_unit,
          description: sample_task.description
        )
        if sample_task.private_note
          PrivateNote.create!(
            content: sample_task.private_note,
            noteable: sample_task.sample,
            created_by: user.id
          )
        end
      end

      private

      def update_with_scan_data
        file = params.delete(:file)
        params[:attachment_attributes] = {
          filename: file[:filename],
          content_type: file[:type],
          file_path: file[:tempfile].path,
          created_by: user.id
        }

        sample_task.update!(params)
      end

      # This encapsulates the logic which samples a given user can access.
      # As in the near future the logic for shared/synched collections will change, it is feasible to extract
      # this into its own method, even if currently there is only dummy logic used
      def user_accessible_samples
        user.samples
      end

      def too_many_parameters?
        params
          .values(:sample_id, :measurement_value, :measurement_unit, :file)
          .all?(&:present?)
      end

      def sample_task_already_updated?
        sample_task.sample.present? &&
          sample_task.attachment.present? &&
          sample_task.measurement_value.present?
      end

      def missing_free_scan_parameters?
        params[:measurement_value] &&
          params[:measurement_unit] &&
          params[:file]
      end
    end
  end
end
