# frozen_string_literal: true

module DelayedJobHelpers
  # Creates a Delayed::Job row that looks, to PubchemRateLimitGuard's textual
  # `handler LIKE` check, like a currently-executing instance of +job_class_name+.
  #
  # @param job_class_name [String] e.g. 'PubchemLcssJob'
  # @param job_id [String] the ActiveJob id embedded in the handler; pass a
  #   distinct value to simulate a different job instance than the one under test
  # @return [Delayed::Job]
  def create_locked_delayed_job(job_class_name, job_id: SecureRandom.uuid)
    handler = <<~YAML
      --- !ruby/object:ActiveJob::QueueAdapters::DelayedJobAdapter::JobWrapper
      job_data:
        job_class: #{job_class_name}
        job_id: #{job_id}
        queue_name: default
        arguments: []
    YAML

    Delayed::Job.create!(handler: handler, locked_at: Time.current, locked_by: 'test-worker')
  end
end
