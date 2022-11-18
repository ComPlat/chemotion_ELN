# frozen_string_literal: true

module Chemotion
  class SampleTaskAPI < Grape::API
    rescue_from ActiveRecord::RecordInvalid do |exception|
      error!(exception.record.errors.full_messages.join("\n"), 400)
    end

    rescue_from ActiveRecord::RecordNotFound do
      error!('Sample not found', 400)
    end

    rescue_from Grape::Exceptions::ValidationErrors do |exception|
      error!(exception.message, 422)
    end

    resource :sample_tasks do # rubocop:disable Metrics/BlockLength
      # Index: List all scan tasks for the given parameters
      params do
        optional :status, type: String, values: %w[open open_free_scan done], default: 'open'
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
        optional :create_open_sample_task, type: Hash do
          requires :sample_id, type: Integer, description: 'ID of the sample to scan'
        end

        optional :create_open_free_scan, type: Hash do
          requires :measurement_value, type: Float
          requires :measurement_unit, type: String
          optional :description, type: String
          optional :additional_note, type: String
          optional :private_note, type: String
          requires :file, type: File # automatically provides subfields filename, type and tempfile
        end
        exactly_one_of :create_open_sample_task, :create_open_free_scan
      end
      post do
        # create initial instance with empty parameters. They will get overridden later
        creator = Usecases::SampleTasks::Create.new(params: {}, user: current_user)
        scan_task = nil

        if params[:create_open_sample_task]
          creator.params = declared(params, include_missing: false)[:create_open_sample_task]
          scan_task = creator.create_open_sample_task
        else
          creator.params = declared(params, include_missing: false)[:create_open_free_scan]
          scan_task = creator.create_open_free_scan
        end

        present scan_task, with: Entities::SampleTaskEntity
      end

      # update a sample task
      params do
        optional :update_open_free_scan, type: Hash do
          optional :sample_id, type: Integer, description: 'ID of the sample to scan'
        end

        optional :update_open_sample_task, type: Hash do
          optional :measurement_value, type: Float
          optional :measurement_unit, type: String
          optional :description, type: String
          optional :additional_note, type: String
          optional :private_note, type: String
          optional :file, type: File # automatically provides subfields filename, type and tempfile
        end
        exactly_one_of :update_open_sample_task, :update_open_free_scan
      end
      put ':id' do
        # create initial instance with empty parameters. They will get overridden later
        updater = Usecases::SampleTasks::Update.new(params: {}, user: current_user, sample_task: nil)
        if params[:update_open_free_scan]
          updater.sample_task = SampleTask.open_free_scan.find(params[:id])
          updater.params = declared(params, include_missing: false)[:update_open_free_scan]
        else
          updater.sample_task = SampleTask.open.find(params[:id])
          updater.params = declared(params, include_missing: false)[:update_open_sample_task]
        end

        # Run the update within a transaction to prevent data corruption if the sample task was updated
        # but the measurement transfer fails for some reason
        SampleTask.transaction do
          updater.update_sample_task
          updater.transfer_measurement_to_sample
        end

        # TODO: klären ob hier sinnvollerweise sowohl SampleTask als auch Sample zurückgegeben werden sollten
        present updater.sample_task, with: Entities::SampleTaskEntity
      end
    end
  end
end
