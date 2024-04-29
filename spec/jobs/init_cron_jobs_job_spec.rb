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

  it 'initializes cron jobs' do
    ENV['DUMMY_CRON'] = cron_schedule
    Delayed::Job.where(queue: 'dummy').delete_all
    described_class.perform_now(cron_job_list)
    expect(Delayed::Job.where(queue: 'dummy').last&.cron).to eq(cron_schedule)
  end

  it 'has initialized a reccuring job running next weekend' do
    Delayed::Job.where(queue: 'dummy').delete_all
    described_class.perform_now(cron_job_list)
    expect(
      Delayed::Job.where(
        'run_at > ? and run_at < ?', Time.zone.now.end_of_week(:friday), Time.zone.now.next_week(:monday)
      ).where(queue: 'dummy').where.not(cron: nil).count,
    ).to eq(1)
  end
end
