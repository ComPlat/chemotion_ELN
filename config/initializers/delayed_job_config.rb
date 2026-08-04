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
#
# PubchemLookupJob derives its own per-run budget from this (its RUN_BUDGET_RATIO), so lowering
# it shortens that job's chunks rather than letting a run overrun.
# Raising it also widens the window in which a crashed worker's lock still reads as held —
# PubchemLookupJob treats a lock older than max_run_time as stale — so a worker that dies
# mid-run now blocks its siblings for up to an hour rather than half of one.
Delayed::Worker.max_run_time = 60.minutes
Delayed::Worker.raise_signal_exceptions = :term
Delayed::Worker.logger = Logger.new(File.join(Rails.root, 'log', 'delayed_job.log'))
Delayed::Worker.logger = Logger.new($stdout) if Rails.env.test?

# Job classes removed from the codebase whose rows may still be queued. See the cleanup step
# inside the after_initialize block. Plain strings, deliberately — the whole point is that no constant
# needs to survive for these to be recognised.
OBSOLETE_JOB_CLASSES = %w[PubchemSingleLcssJob PubchemCidJob PubchemLcssJob].freeze

# Drops queued rows naming a class that no longer exists — recurring *and* one-off, hence no
# `cron` scoping. Such a row can never run again: deserialization raises NameError, the row
# burns through Delayed::Worker.max_attempts and lands in failed_jobs.
#
# Matching on the serialized `job_class:` rather than on a constant is the point: nothing has to
# be kept alive in app/jobs just so these rows can be named.
#
# Nothing is lost by dropping them. The work is derived from a pending scope in the database,
# never carried in the queue row: a destroyed sweep continuation just means its successor
# re-derives the same remaining set, and a destroyed per-molecule PubchemSingleLcssJob row named
# a molecule that is still in that scope. The one cost is latency — such a molecule waits for the
# next PubchemLookupJob run rather than being enriched promptly.
#
# Remove a name once no deployment can still be carrying its rows.
purge_obsolete_jobs = lambda do
  patterns = OBSOLETE_JOB_CLASSES.map { |name| "%job_class: #{name}%" }
  obsolete = Delayed::Job.where('handler like any (array[?])', patterns)
  next unless obsolete.exists?

  msg = "Deleting queued jobs for removed classes: #{OBSOLETE_JOB_CLASSES.join(', ')}"
  puts msg
  Rails.logger.info msg
  obsolete.destroy_all
end

# CRON_CONFIG_PC_LCSS no longer has a job of its own — PubchemLookupJob's sweep does both the
# cid and the LCSS halves. Say so once at boot rather than ignoring a setting silently.
if ENV.fetch('CRON_CONFIG_PC_LCSS', nil).present?
  msg = 'CRON_CONFIG_PC_LCSS is obsolete: PubchemLcssJob was folded into PubchemLookupJob, ' \
        'which is scheduled by CRON_CONFIG_PC_CID. The value is ignored.'
  puts msg
  Rails.logger.warn msg
end

# The recurring-job (re)scheduling references app Job constants. Running it via
# `ActiveSupport.on_load(:active_record)` autoloaded them DURING initialization,
# which is deprecated in Zeitwerk mode and becomes an error in Rails 7
# (DEV_RAILS_UPGRADE_7-0.md §0d, upgrade guide §6.7). Deferred to
# `config.after_initialize`: it runs after the autoloaders are fully set up (no
# deprecation) AND only ONCE per boot — so, unlike `to_prepare` (which re-runs on
# every code reload), InitCronJobsJob is not scheduled multiple times.
Rails.application.config.after_initialize do
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
    # One PubChem job; CRON_CONFIG_PC_CID keeps its name so existing deployments keep working.
    # Its two predecessors are handled by OBSOLETE_JOB_CLASSES below rather than by entries
    # here — they have no constants left to name.
    { job_class: PubchemLookupJob,     enabled: :default, cron_variable: 'CRON_CONFIG_PC_CID' },
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

  purge_obsolete_jobs.call

  # Reschedule all recurring jobs
  #    InitCronJobsJob.perform_later(recurring_jobs)
  puts 'Rescheduling recurring jobs'
  Rails.logger.info 'Rescheduling recurring jobs'
  InitCronJobsJob.perform_now(recurring_jobs)
rescue PG::ConnectionBad, ActiveRecord::NoDatabaseError => e
  puts e.message
end
# end
