# frozen_string_literal: true

# Delayed::Worker.destroy_failed_jobs = false
# Delayed::Worker.sleep_delay = 60
# Delayed::Worker.max_attempts = 3
# Delayed::Worker.max_run_time = 5.minutes
# Delayed::Worker.read_ahead = 10
# Delayed::Worker.default_queue_name = 'default'
# Delayed::Worker.delay_jobs = !Rails.env.test?
# Delayed::Worker.raise_signal_exceptions = :term
Delayed::Worker.logger = Logger.new(File.join(Rails.root, 'log', 'delayed_job.log'))
Delayed::Worker.logger = Logger.new($stdout) if Rails.env.test?

# NB: this initialiser is NOT idempotent (yet), do NOT use:  `Rails.application.reloader.to_prepare do` block
# to supress:
# ```
# DEPRECATION WARNING: Initialization autoloaded the constants  ApplicationRecord
#  ApplicationJob, CollectDataFromMailJob, CollectDataFromSftpJob, CollectDataFromLocalJob,
#  CollectFileFromLocalJob, CollectFileFromSftpJob, PubchemCidJob, PubchemLcssJob,
#  RefreshElementTagJob, ChemrepoIdJob, and InitCronJobsJob.
#
# Being able to do this is deprecated. Autoloading during initialization is going
# to be an error condition in future versions of Rails.
# ```
# otherwise InitCronJobsJob will be called multiple times

# NB: this initialiser is NOT idempotent (yet), do NOT use:  `Rails.application.reloader.to_prepare do` block
# to supress:
# ```
# DEPRECATION WARNING: Initialization autoloaded the constants  ApplicationRecord
#  ApplicationJob, CollectDataFromMailJob, CollectDataFromSftpJob, CollectDataFromLocalJob,
#  CollectFileFromLocalJob, CollectFileFromSftpJob, PubchemCidJob, PubchemLcssJob,
#  RefreshElementTagJob, ChemrepoIdJob, and InitCronJobsJob.
#
# Being able to do this is deprecated. Autoloading during initialization is going
# to be an error condition in future versions of Rails.
# ```
# otherwise InitCronJobsJob will be called multiple times

ActiveSupport.on_load(:active_record) do
  next unless ActiveRecord::Base.connection.table_exists?('delayed_jobs') && Delayed::Job.column_names.include?('cron')

  # List of recuringreccuring jobs with default attributes JobClass, enabled, cron_variable
  reccuring_jobs = [
    # Data Collectors Classes
    { job_class: CollectDataFromMailJob,  enabled: :datacollector },
    { job_class: CollectDataFromSftpJob,  enabled: :datacollector },
    { job_class: CollectDataFromLocalJob, enabled: :datacollector },
    { job_class: CollectFileFromLocalJob, enabled: :datacollector },
    { job_class: CollectFileFromSftpJob,  enabled: :datacollector },

    # Other Classes
    { job_class: PubchemCidJob,        enabled: :default, cron_variable: 'CRON_CONFIG_PC_CID' },
    { job_class: PubchemLcssJob,       enabled: :default, cron_variable: 'CRON_CONFIG_PC_LCSS' },
    { job_class: RefreshElementTagJob, enabled: :default, cron_variable: 'CRON_CONFIG_REFRESH_ELEMENT_TAG' },
    { job_class: ChemrepoIdJob,        enabled: false,    cron_variable: 'CRON_CONFIG_CHEMREPO_ID' },
  ]

  # Delete all reccuring jobs
  like_array = ['%InitCronJobsJob%']
  like_array += reccuring_jobs.map { |job| "%#{job[:job_class].name}%" }
  puts "Deleting all reccuring jobs: #{like_array}"
  Rails.logger.info "Deleting all reccuring jobs: #{like_array}"
  Delayed::Job.where('handler like any (array[?])', like_array).destroy_all

  # Reschedule all reccuring jobs
  #    InitCronJobsJob.perform_later(reccuring_jobs)
  puts 'Rescheduling reccuring jobs'
  Rails.logger.info 'Rescheduling reccuring jobs'
  InitCronJobsJob.perform_now(reccuring_jobs)
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  puts e.message
end
# end
