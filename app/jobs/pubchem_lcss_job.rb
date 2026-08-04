# frozen_string_literal: true

# Job to update molecule info for molecules with no LCSS
# associated LCSS (molecule tag) is updated if cid found in PC db
class PubchemLcssJob < ApplicationJob
  include PubchemRateLimitGuard

  queue_as :pubchemLcss

  # max molecules processed in a single invocation before requeuing a follow-up
  # to continue from where this run left off
  CHUNK_SIZE = 1000

  # NB: PC has request restriction policy and timeout , hence the sleep_time and batch_size params
  # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
  #
  # @param start_id [Integer] resume point (exclusive) — only molecules with id > start_id
  #   are considered. Together with the self-requeue below this rotates full coverage of
  #   all pending molecules across successive runs instead of always starting from id 1.
  def perform(sleep_time: 10, batch_size: 50, chunk_size: CHUNK_SIZE, start_id: 0)
    if other_pubchem_job_running?
      self.class.set(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
          .perform_later(sleep_time: sleep_time, batch_size: batch_size,
                         chunk_size: chunk_size, start_id: start_id)
      return
    end

    t_limit = 2.hours.from_now
    last_id = start_id
    processed = 0

    pending_scope(after_id: start_id).find_in_batches(batch_size: batch_size) do |batch|
      batch.each do |mol|
        mol.pubchem_lcss
        # request every 0.5 second
        sleep 0.5
      end
      last_id = batch.last.id
      processed += batch.size
      break if processed >= chunk_size || Time.zone.now > t_limit

      sleep sleep_time
    end

    requeue_next_chunk(sleep_time: sleep_time, batch_size: batch_size, chunk_size: chunk_size, last_id: last_id)
  end

  private

  def pending_scope(after_id:)
    Molecule.includes(:tag)
            .joins("inner join element_tags et on et.taggable_id = molecules.id and et.taggable_type = 'Molecule' ")
            .where("et.taggable_data->>'pubchem_cid' is not null")
            .where("et.taggable_data->>'pubchem_cid' ~ '^[0-9]+$'")
            .where("et.taggable_data->>'pubchem_lcss' is null")
            .where('molecules.id > ?', after_id)
            .order(:id)
            .distinct
  end

  # Requeues a one-off continuation carrying the rotation cursor (+last_id+) forward
  # when pending molecules remain beyond it. If none remain, does nothing — this job has
  # no independent cron schedule of its own; PubchemCidJob chains a fresh run (start_id: 0)
  # at the end of its own cron cadence (see PubchemCidJob#chain_lcss).
  def requeue_next_chunk(sleep_time:, batch_size:, chunk_size:, last_id:)
    return unless pending_scope(after_id: last_id).exists?

    self.class.set(wait: sleep_time.seconds)
        .perform_later(sleep_time: sleep_time, batch_size: batch_size,
                       chunk_size: chunk_size, start_id: last_id)
  end
end
