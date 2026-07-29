# frozen_string_literal: true

# Per-molecule PubChem enrichment job, scheduled for every newly created molecule via
# Molecule.schedule_lcss_batch (directly for batch imports, or via the after_create_commit
# :get_lcss hook). For each molecule it enriches names/iupac/cid from PubChem (see
# Molecule#enrich_from_pubchem) and then updates the LCSS molecule tag. This is where the
# PubChem network work moved to after it was removed from the synchronous create path.
class PubchemLookupJob < ApplicationJob
  include PubchemRateLimitGuard

  queue_as :pubchem_lookup

  # NB: PC has request restriction policy, hence the sleep — matches the
  # spacing already used by the sibling cron batch job, PubchemLcssJob.
  SLEEP_BETWEEN_REQUESTS = 0.5

  # @param ids [Array<Integer>, nil] molecule ids (default) or sample ids (see +type+)
  # @param type [Symbol] +:molecules+ (default) or +:samples+ — when +:samples+, +ids+
  #   is resolved to the distinct molecule ids referenced by those samples first
  # @param created_after [ActiveSupport::TimeWithZone, nil] only include molecules
  #   created after this time; combines with +ids+ (or its resolved molecule ids) as
  #   an intersection (AND), narrowing rather than extending the set
  # @param chunk_size [Integer] max molecules processed in a single invocation before
  #   self-requeuing a follow-up to continue from where this run left off — a wide-open
  #   +created_after+ (e.g. from a large import) could otherwise resolve to thousands of
  #   molecules and run long enough to hit Delayed::Worker.max_run_time
  # @param start_id [Integer] resume point (exclusive) — only molecules with id > start_id
  #   are considered
  def perform(ids = nil, type: :molecules, created_after: nil,
              chunk_size: PubchemLcssJob::CHUNK_SIZE, start_id: 0)
    # TODO: > stub request for testing
    return if Rails.env.test?
    return if ids.blank? && created_after.blank?

    if other_pubchem_job_running?
      self.class.set(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
          .perform_later(ids, type: type, created_after: created_after,
                              chunk_size: chunk_size, start_id: start_id)
      return
    end

    molecule_ids = ids.present? && type.to_sym == :samples ? resolve_sample_molecule_ids(ids) : ids
    molecules = resolve_molecules(molecule_ids, created_after: created_after,
                                                start_id: start_id, chunk_size: chunk_size)

    molecules.each_with_index do |molecule, i|
      sleep SLEEP_BETWEEN_REQUESTS if i.positive?
      # Enrich (iupac_name/names/cid) before LCSS so the cid is already persisted and
      # Molecule#pubchem_lcss doesn't fall back to its own get_cid_from_inchikey lookup.
      molecule.enrich_from_pubchem
      molecule.pubchem_lcss
    end
    return if molecules.empty?

    last_id = molecules.last.id
    return unless more_pending?(molecule_ids, created_after: created_after, after_id: last_id)

    # No wait — this isn't a collision backoff, just more work to continue with.
    self.class.perform_later(molecule_ids, type: :molecules, created_after: created_after,
                                           chunk_size: chunk_size, start_id: last_id)
  end

  private

  def resolve_sample_molecule_ids(sample_ids)
    Sample.where(id: sample_ids).where.not(molecule_id: nil).distinct.pluck(:molecule_id)
  end

  # @return [Array<Molecule>] up to +chunk_size+ molecules still missing LCSS data,
  #   ordered by id, with +:tag+ eager loaded (single query, also used to filter out
  #   molecules a competing job already finished — e.g. during this job's own requeue delay)
  def resolve_molecules(ids, created_after:, start_id:, chunk_size: nil)
    pending_scope(ids, created_after: created_after, after_id: start_id).limit(chunk_size).to_a
  end

  # @return [Boolean] whether any pending molecule remains beyond +after_id+
  def more_pending?(ids, created_after:, after_id:)
    pending_scope(ids, created_after: created_after, after_id: after_id).exists?
  end

  def pending_scope(ids, created_after:, after_id:)
    # eager_load(:tag) is a LEFT OUTER JOIN, so a molecule with no element_tags row at
    # all would otherwise also match `... is null` below and crash Molecule#pubchem_lcss,
    # which assumes tag is present. Exclude those explicitly.
    scope = Molecule.eager_load(:tag)
                    .where.not(element_tags: { id: nil })
                    .where("element_tags.taggable_data->>'pubchem_lcss' is null")
                    .where('molecules.id > ?', after_id)
                    .order(:id)
    scope = scope.where(id: ids) if ids.present?
    scope = scope.where('molecules.created_at > ?', created_after) if created_after.present?
    scope
  end
end
