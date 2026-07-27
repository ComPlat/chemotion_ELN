# frozen_string_literal: true

module DelayedJobHelpers
  # Creates a Delayed::Job row that looks, to PubchemRateLimitGuard's textual
  # `handler LIKE` check, like a currently-executing instance of +job_class_name+.
  #
  # @param job_class_name [String] e.g. 'PubchemLcssJob'
  # @param job_id [String] the ActiveJob id embedded in the handler; pass a
  #   distinct value to simulate a different job instance than the one under test
  # @param locked_at [Time] when the lock was taken; pass a time older than
  #   +Delayed::Worker.max_run_time+ to simulate a stale lock from a dead worker
  # @return [Delayed::Job]
  def create_locked_delayed_job(job_class_name, job_id: SecureRandom.uuid, locked_at: Time.current)
    handler = <<~YAML
      --- !ruby/object:ActiveJob::QueueAdapters::DelayedJobAdapter::JobWrapper
      job_data:
        job_class: #{job_class_name}
        job_id: #{job_id}
        queue_name: default
        arguments: []
    YAML

    Delayed::Job.create!(handler: handler, locked_at: locked_at, locked_by: 'test-worker')
  end
end
