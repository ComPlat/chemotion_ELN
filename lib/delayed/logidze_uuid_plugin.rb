# frozen_string_literal: true

module Delayed
  # Gives every background job its own Logidze version uuid, so the History tab groups the changes a job saves
  # into one entry, the way it does for a request (see LogidzeModule). Jobs have no responsible user. A job run
  # inline within a request (Delayed::Worker.delay_jobs = false) keeps the request's uuid.
  class LogidzeUuidPlugin < Delayed::Plugin
    callbacks do |lifecycle|
      lifecycle.around(:invoke_job) do |job, *args, &block|
        next block.call(job, *args) if Logidze.uuid_set?

        begin
          Logidze.with_uuid!
          block.call(job, *args)
        ensure
          Logidze.clear_responsible!
        end
      end
    end
  end
end
