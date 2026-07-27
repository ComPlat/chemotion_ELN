# frozen_string_literal: true

# Shared concurrency guard for jobs that call out to PubChem's rate-limited LCSS
# endpoint. PubchemSingleLcssJob and PubchemLcssJob must never run at the same time
# as each other, or as another instance of themselves.
module PubchemRateLimitGuard
  extend ActiveSupport::Concern

  GUARDED_JOB_CLASSES = %w[PubchemLcssJob PubchemSingleLcssJob].freeze
  REQUEUE_DELAY = 15.minutes

  private

  # @return [Boolean] whether a delayed_job worker currently holds the lock on another
  #   guarded job's row (i.e. it is actively executing right now).
  def other_pubchem_job_running?
    like_patterns = GUARDED_JOB_CLASSES.map { |name| "%job_class: #{name}%" }
    Delayed::Job.where('handler like any (array[?])', like_patterns)
                .where.not(locked_at: nil)
                .where.not('handler like ?', "%job_id: #{job_id}%")
                .exists?
  end
end
