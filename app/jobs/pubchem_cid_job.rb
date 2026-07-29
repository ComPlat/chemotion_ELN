# frozen_string_literal: true

# Job to update molecule info for molecules with no CID
# associated CID (molecule tag) and iupac names (molecule_names) are updated if
# inchikey found in PC db
class PubchemCidJob < ApplicationJob
  include PubchemRateLimitGuard

  queue_as :pubchem

  # max molecules processed in a single invocation before requeuing a follow-up
  # to continue from where this run left off — mirrors PubchemLcssJob's rotation design
  CHUNK_SIZE = 1000

  # NB: PC has request restriction policy and timeout , hence the sleep_time and batch_size params
  # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
  #
  # @param start_id [Integer] resume point (exclusive) — only molecules with id > start_id
  #   are considered. Together with the self-requeue below this rotates full coverage of
  #   all pending molecules across successive runs instead of always restarting from the
  #   newest end of the id range (the previous `order: :desc`, wall-clock-only cutoff could
  #   starve older backlogged molecules indefinitely once the pending set outgrew a single
  #   2-hour run).
  def perform(sleep_time: 10, batch_size: 10, chunk_size: CHUNK_SIZE, start_id: 0)
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
      pb_info = Chemotion::PubchemService.molecule_info_from_inchikeys(batch.map(&:inchikey))
      pb_info.each do |obj|
        Molecule.find_by(inchikey: obj[:inchikey], is_partial: false)&.assign_pubchem_names_and_cid!(obj)
      end

      last_id = batch.last.id
      processed += batch.size
      break if processed >= chunk_size || Time.zone.now > t_limit

      sleep sleep_time
    end

    continue_or_chain(sleep_time: sleep_time, batch_size: batch_size,
                      chunk_size: chunk_size, last_id: last_id)
  end

  private

  # Triggers PubchemLcssJob once the rotation has drained, instead of leaving it on its own
  # independently-scheduled cron cadence.
  #
  # Only fired on the final chunk. Firing per chunk enqueued one LCSS rotation per chunk with
  # overlapping id ranges — a 50k-molecule backlog produced ~50 of them — and since
  # PubchemRateLimitGuard serialises all PubChem jobs, all but one spent their lives bouncing
  # on a 15-minute REQUEUE_DELAY, which in turn kept colliding with CID's own continuations
  # and slowed the rotation it was meant to follow.
  #
  # start_id: 0 because by this point the whole range has been swept, so LCSS should scan it
  # all rather than resume from a cursor into it.
  def chain_lcss
    return if ENV.fetch('CRON_CONFIG_PC_LCSS', nil) == 'disabled'

    PubchemLcssJob.perform_later(start_id: 0)
  end

  def pending_scope(after_id:)
    Molecule.select(:id, :inchikey).joins(:samples)
            .joins("inner join element_tags et on et.taggable_id = molecules.id and et.taggable_type = 'Molecule'")
            .where(is_partial: false)
            .where("et.taggable_data->>'pubchem_cid' isnull")
            .where('molecules.id > ?', after_id)
            .order(:id)
            .distinct
  end

  # Carries the rotation forward while molecules remain beyond +last_id+, and hands over to
  # LCSS once it has drained. Exactly one of the two happens per run.
  def continue_or_chain(sleep_time:, batch_size:, chunk_size:, last_id:)
    if pending_scope(after_id: last_id).exists?
      requeue_next_chunk(sleep_time: sleep_time, batch_size: batch_size,
                         chunk_size: chunk_size, last_id: last_id)
    else
      chain_lcss
    end
  end

  # Requeues a one-off continuation carrying the rotation cursor (+last_id+) forward.
  def requeue_next_chunk(sleep_time:, batch_size:, chunk_size:, last_id:)
    self.class.set(wait: sleep_time.seconds)
        .perform_later(sleep_time: sleep_time, batch_size: batch_size,
                       chunk_size: chunk_size, start_id: last_id)
  end
end
