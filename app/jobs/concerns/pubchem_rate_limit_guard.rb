# frozen_string_literal: true

# Shared concurrency guard for jobs that call out to PubChem's rate-limited endpoints.
# PubchemLookupJob, PubchemLcssJob, and PubchemCidJob all hit the same PubChem rate
# limit (LCSS and CID/name lookups alike), so none of them may run at the same time as
# each other, or as another instance of themselves.
module PubchemRateLimitGuard
  extend ActiveSupport::Concern

  GUARDED_JOB_CLASSES = %w[PubchemLcssJob PubchemLookupJob PubchemCidJob].freeze
  REQUEUE_DELAY = 15.minutes

  private

  # @return [Boolean] whether a delayed_job worker currently holds the lock on another
  #   guarded job's row (i.e. it is actively executing right now). A lock older than
  #   +Delayed::Worker.max_run_time+ is stale — its worker died without releasing it —
  #   and is treated as not running, so a crashed worker can't block this guard forever.
  def other_pubchem_job_running?
    like_patterns = GUARDED_JOB_CLASSES.map { |name| "%job_class: #{name}%" }
    Delayed::Job.where('handler like any (array[?])', like_patterns)
                .where(locked_at: Delayed::Worker.max_run_time.ago..)
                .where.not('handler like ?', "%job_id: #{job_id}%")
                .exists?
  end
end
