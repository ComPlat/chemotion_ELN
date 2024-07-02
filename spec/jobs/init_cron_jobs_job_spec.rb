# frozen_string_literal: true

class DummyJob < ApplicationJob
  queue_as :dummy

  def perform(*args)
    # Do something later
    puts "DummyJob: #{args}"
    logger.info "DummyJob: #{args}"
  end
end

RSpec.describe InitCronJobsJob do
  let(:cron_job_list) do
    [{ job_class: DummyJob, enabled: :default, cron_variable: 'DUMMY_CRON' }]
  end
  let(:cron_schedule) { '5 5 * * 5' }

  it "initializes cron jobs at #{Time.zone.now.strftime('%Y-%m-%d-%A %H:%M:%S')} (#{ENV.fetch('DUMMY_CRON', nil)})" do
    ENV['DUMMY_CRON'] = cron_schedule
    Delayed::Job.where(queue: 'dummy').delete_all
    described_class.perform_now(cron_job_list)
    expect(Delayed::Job.where(queue: 'dummy').last&.cron).to(
      eq(cron_schedule),
      "Cron schedule is not set to #{cron_schedule}.\n - ENV[DUMMY_CRON]: #{ENV.fetch('DUMMY_CRON', nil)}\n " \
      "- dummy DJ count: #{Delayed::Job.where(queue: 'dummy').count}",
    )
  end

  it "has initialized a reccuring job running next weekend at #{Time.zone.now.strftime('%Y-%m-%d-%a %H:%M:%S')} " \
     "(#{ENV.fetch('DUMMY_CRON', nil)})" do
    ENV['DUMMY_CRON'] = nil
    Delayed::Job.where(queue: 'dummy').delete_all
    described_class.perform_now(cron_job_list)

    expect(
      Delayed::Job.where('run_at > ? and run_at < ?', Time.zone.now, 1.week.from_now)
                  .where('EXTRACT(ISODOW FROM run_at) IN (6, 7)')
                  .where(queue: 'dummy')
                  .where.not(cron: nil)
                  .count,
    ).to(
      eq(1),
      "Did not found a dummy job with a random weekend schedule.\n " \
      "- ENV[DUMMY_CRON]: #{ENV.fetch('DUMMY_CRON', nil)}\n " \
      "- dummy DJ count: #{(dj = Delayed::Job.where(queue: 'dummy')).count}\n " \
      "- #{dj.pluck(:run_at, :cron)}",
    )
  end
end
