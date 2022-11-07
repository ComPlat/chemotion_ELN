# frozen_string_literal: true

module Chemotion
  class SampleTaskAPI < Grape::API
    rescue_from ActiveRecord::RecordInvalid do |exception|
      error!(exception.record.errors.full_messages.join("\n"), 400)
    end

    rescue_from ActiveRecord::RecordNotFound do |exception|
      error!('Sample not found', 400)
    end

    resource :sample_tasks do
      # Index: List all scan tasks for the given parameters
      params do
        optional :status, type: String, values: %w[open open_free_scan done], default: 'open'
        optional :free_scans_only, type: Boolean, default: false
      end
      get do
        scan_tasks = SampleTask.for(current_user).public_send(params[:status])

        present scan_tasks, with: Entities::SampleTaskEntity
      end

      # create a new scan task
      # unfortunately Grape does not allow grouping parameters into virtual groups, so we could use
      # the mutually_exclusive feature to make the API better readable. Using it would create
      # nested objects, which we do not want to have (so we don't need to change the app again)
      # It still would make for a better readable API
      params do
        optional :sample_id, Integer, description: 'ID of the sample to scan'
        optional :measurement_value, Float
        optional :measurement_unit, String
        optional :description, String
        optional :additional_note, String
        optional :private_note, String
        optional :file, File # automatically provides subfields filename, type and tempfile
      end
      post do
        scan_task = Usecases::SampleTasks::Create.execute!(
          declared(params, include_missing: false),
          creator: current_user
        )

        present scan_task, with: Entities::SampleTaskEntity
      end
    end
  end
end
