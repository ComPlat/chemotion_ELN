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

      def transfer_measurement_to_sample # rubocop:disable Metrics/AbcSize, Metrics/MethodLength
        sample_task.sample.update!(
          real_amount_value: sample_task.measurement_value,
          real_amount_unit: sample_task.measurement_unit,
          description: sample_task.description,
        )
        return unless sample_task.private_note

        PrivateNote.create!(
          content: sample_task.private_note,
          noteable: sample_task.sample,
          created_by: user.id,
        )
      end

      private

      def update_with_scan_data # rubocop:disable Metrics/AbcSize
        file = params.delete(:file)
        params[:attachment_attributes] = {
          filename: file[:filename],
          content_type: file[:type],
          file_path: file[:tempfile].path,
          created_by: user.id,
        }

        sample_task.update!(params)

        # until the Shrine integration is refactored
        sample_task.attachment.attachment_attacher.attach(File.open(file[:tempfile], binmode: true))
        sample_task.attachment.save!
      end
    end
  end
end
