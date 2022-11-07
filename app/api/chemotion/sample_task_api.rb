# frozen_string_literal: true

module Chemotion
  class SampleTaskAPI < Grape::API

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
    end
  end
end
