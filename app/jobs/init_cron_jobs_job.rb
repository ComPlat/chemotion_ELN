# frozen_string_literal: true

# desc:  Init cron jobs: validate schedule input into a cron schedule and create delayed job
#     for each schedule, also ensure wait_until is set to the next scheduled time.
#     Setting wait_until is not necessary if the application is running but otherwise
#     can avoid immediate qeueing in some cases (perform_now on boot, etc)
#
class InitCronJobsJob < ApplicationJob
  attr_reader :job

  # desc: iterate through the arg jobs and queue each of the tasks if possible.
  #
  # @params jobs [Array] a list of tasks to queue. eg: [{job_class: 'JobClass', enabled: :datacollector}]
  # Each iteration sets: @job, @cron_schedule, @next_run_time, @message
  #  job = current task to queue
  #  cron_schedule = validated cron schedule for the task
  #  next_run_time = calculated next run time for the task
  #  message = last message to log on completion
  def perform(jobs)
    # Create all enabled reccuring jobs
    jobs.each do |job_entry|
      @job = job_entry
      next unless entry_valid? && entry_enabled? && next_run_time

      # enqueue the job with the calculated cron schedule and next_run_time
      # next_run_time ensure the job is enqueued at the right time and not immediately
      active_job = job[:job_class].set(wait_until: next_run_time, cron: cron_schedule).perform_later
      success_message(active_job)
    rescue StandardError => e
      Delayed::Worker.logger.error { "Error enqueuing job: #{job.inspect}\n #{active_job.inspect}\n#{e.message}" }
    ensure
      Delayed::Worker.logger.info { @message }
      reset_instance_variables
    end
  end

  private

  ################################################################################################
  # utility methods
  ################################################################################################

  # desc: reset instance variables
  def reset_instance_variables
    @job = nil
    @cron_schedule = nil
    @next_run_time = nil
    @message = nil
  end

  # desc: check if the job entry is valid
  def entry_valid?
    job.is_a?(Hash) && job.key?(:job_class) && job.key?(:enabled)
  ensure
    @message = "Not enqueuig invalid job#{job.inspect}"
  end

  def entry_enabled?
    job[:enabled].present?
  ensure
    @message = "Not enqueuig disabled job#{job[:job_class]}" unless job[:enabled]
  end

  # desc: select scheduler for the job and set the cron schedule
  def cron_schedule
    @cron_schedule ||= case job[:enabled]
                       when :datacollector
                         cron_schedule_datacollector
                       when :default
                         cron_schedule_default
                       end
  end

  # desc: convert a string to a cron schedule
  def to_cron(reccurence)
    Fugit.parse_cronish(reccurence)&.to_cron_s if reccurence.present?
  rescue StandardError => e
    Delayed::Worker.logger.info { "Error parsing reccurence: #{reccurence} - #{e.message}" }
    nil
  ensure
    @message = "Not enqueuing #{job[:job_class]}: cannot cron schedule #{reccurence}"
  end

  # desc: calculate next run time with Fugit
  def next_run_time
    @next_run_time ||= Fugit.parse_cronish(cron_schedule)&.next_time&.to_t
  rescue StandardError => e
    @message = "Error parsing cron schedule: #{cron_schedule} - #{e.message}"
    @next_run_time = nil
  end

  def success_message(active_job)
    dj = Delayed::Job.find_by(id: active_job.provider_job_id)
    @message = "Enqueuing #{job[:job_class]}:  cron schedule: #{cron_schedule} - "
    @message += dj.present? ? "#{dj.cron}, next run at: #{dj.run_at}" : "Job not found. run_at was #{next_run_time}"
  end

  ################################################################################################
  # default schedules: job schedules can be set through env variables or get a weekly default
  ################################################################################################

  # desc: get a default weekly cron_schedule for the job unless cron env variable is defined
  def cron_schedule_default
    env_var = ENV.fetch(job[:cron_variable], nil)
    return "#{rand(0..59)} #{rand(0..23)} * * #{rand(6..7)}" if env_var.blank?

    return nil if env_var == 'disabled'

    to_cron(env_var)
  end

  ################################################################################################
  # datacollector schedules: set through the datacollector config config/datacollectors.yml
  ################################################################################################

  # desc: lookup hash to map a job class to a datacollector config service name
  LOOKUP_JOB_SERVICE = {
    CollectDataFromMailJob => 'mailcollector',
    CollectDataFromLocalJob => 'folderwatcherlocal',
    CollectDataFromSftpJob => 'folderwatchersftp',
    CollectFileFromLocalJob => 'filewatcherlocal',
    CollectFileFromSftpJob => 'filewatchersftp',
    SynchronizeAutomationDevicesFilesJob => 'syncautomationdevicesfiles',
  }.freeze

  def datacollector_config
    @datacollector_config ||= Rails.configuration.datacollectors&.dig(:services) || []
  end

  # desc: get the datacollector config for a datacollector job
  def datacollector_config_for_job
    service_name = LOOKUP_JOB_SERVICE[job[:job_class]]
    return nil if service_name.blank?

    datacollector_config.find { |service| service[:name] == service_name }
                        .presence
  ensure
    @message = "Not enqueuing #{job[:job_class]}: no config found"
  end

  # desc: get the cron schedule for a datacollector job
  def cron_schedule_datacollector
    service_config = datacollector_config_for_job
    # service disabled when no config
    return nil if service_config.blank? || service_config[:enabled] == false

    # NB: using fugit we could merge the 2 options into one in the configuration
    #  -> would need documentation update
    every_conf = service_config[:every]
    cron_conf = service_config[:cron]
    return nil if every_conf.blank? && cron_conf.blank?

    # try to parse the config[:every] or config[:cron] to a cron schedule
    every_to_cron(every_conf) || to_cron(cron_conf)
  end

  # desc format into every syntax for Fugit
  def every_to_cron(reccurence)
    return nil if reccurence.blank?

    formated =    case reccurence.to_s.strip
                  when /^\d+$/
                    "every #{reccurence} minutes"
                  else
                    "every #{reccurence}"
                  end
    to_cron formated
  end
end
