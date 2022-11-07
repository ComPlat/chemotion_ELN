# frozen_string_literal: true

module Usecases
  module SampleTasks
    class Create
      attr_reader :params, :creator

      def initialize(params, creator:)
        @params = params
        @creator = creator
      end

      def create_open_sample_task
        sample = user_accessible_samples.find(params[:sample_id])

        SampleTask.create!(creator: creator, sample: sample)
      end

      def create_open_free_scan
        attachment_attributes = if params[:file].present?
          {
            filename: params[:file][:filename],
            content_type: params[:file][:type],
            file_path: params[:file][:tempfile].path,
            created_by: creator.id
          }
        else
          {}
        end

        SampleTask.create!(
          creator: creator,
          measurement_value: params[:measurement_value],
          measurement_unit: params[:measurement_unit],
          description: params[:description],
          additional_note: params[:additional_note],
          private_note: params[:private_note],
          attachment_attributes: attachment_attributes
        )
      end

      private

      # This encapsulates the logic which samples a given user can access.
      # As in the near future the logic for shared/synched collections will change, it is feasible to extract
      # this into its own method, even if currently there is only dummy logic used
      def user_accessible_samples
        creator.samples
      end
    end
  end
end
