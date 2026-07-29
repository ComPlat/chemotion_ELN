# frozen_string_literal: true

# Delayed::Worker.destroy_failed_jobs = false
# Delayed::Worker.sleep_delay = 60
# Delayed::Worker.max_attempts = 3
# Delayed::Worker.read_ahead = 10
# Delayed::Worker.default_queue_name = 'default'
# Delayed::Worker.delay_jobs = !Rails.env.test?

# Bounds worst-case job runtime so a stuck job's delayed_jobs row/lock (and its
# activejob-status key) doesn't stay "running" for the gem's 4-hour default; lets a
# worker killed by an external SIGTERM (deploy/restart) fail its current job fast
# instead of blocking shutdown on completion.
Delayed::Worker.max_run_time = 30.minutes
Delayed::Worker.raise_signal_exceptions = :term
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

ActiveSupport.on_load(:active_record) do
  next unless ActiveRecord::Base.connection.table_exists?('delayed_jobs') && Delayed::Job.column_names.include?('cron')

  # List of recurring jobs with default attributes JobClass, enabled, cron_variable
  recurring_jobs = [
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
    { job_class: DiskUsageJob,         enabled: :default, cron_variable: 'CRON_CONFIG_DISK_USAGE' },
    { job_class: ChemrepoIdJob,        enabled: false,    cron_variable: 'CRON_CONFIG_CHEMREPO_ID' },
  ]

  # Delete all recurring jobs. Scoped to cron IS NOT NULL: InitCronJobsJob sets `cron:` only
  # on the recurring entry it creates below, so a same-class one-off job (e.g. a rotation
  # continuation self-enqueued by PubchemCidJob/PubchemLcssJob/PubchemLookupJob via
  # `self.class.set(wait: ...).perform_later(...)`) has `cron: nil` and must survive a
  # reboot instead of being silently wiped along with the recurring entry.
  like_array = ['%InitCronJobsJob%']
  like_array += recurring_jobs.map { |job| "%#{job[:job_class].name}%" }
  puts "Deleting all recurring jobs: #{like_array}"
  Rails.logger.info "Deleting all recurring jobs: #{like_array}"
  Delayed::Job.where('handler like any (array[?])', like_array).where.not(cron: nil).destroy_all

  # Reschedule all recurring jobs
  #    InitCronJobsJob.perform_later(recurring_jobs)
  puts 'Rescheduling recurring jobs'
  Rails.logger.info 'Rescheduling recurring jobs'
  InitCronJobsJob.perform_now(recurring_jobs)
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  puts e.message
end
# end
