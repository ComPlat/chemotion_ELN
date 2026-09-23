# frozen_string_literal: true

# The single PubChem job. For each molecule it resolves the cid and names
# ({Molecule#enrich_from_pubchem}) and then fetches the GHS/LCSS tag — doing whichever half is
# still outstanding, so one loop covers both.
#
# It runs in three modes, all the same loop over a different slice:
#
# * targeted   — +perform(ids)+ / +perform(ids, type: :samples)+, from
#                {Molecule.schedule_pubchem_lookup_for} and the after_create_commit hook
# * since      — +perform(nil, created_after:)+, one job per bulk import
# * sweep      — +perform+ with no arguments, from cron: the global backfill
#
# The sweep mode replaced PubchemCidJob and PubchemLcssJob, which were this same loop over
# narrower scopes: cid-less molecules and cid'd-but-lcss-less molecules respectively. Both are
# subsets of the pending scope below, and #enrich_and_fetch_lcss already picks the right half
# per molecule. Doing it here also lets a miss be recorded, which PubchemCidJob's batched
# endpoint could not report (see Molecule#record_pubchem_miss!).
class PubchemLookupJob < ApplicationJob
  queue_as :pubchem_lookup

  # How long a run that finds a sibling already executing waits before trying again.
  REQUEUE_DELAY = 15.minutes

  # Spread added to REQUEUE_DELAY, because the guard is an advisory check with no tie-break:
  # two runs reserved milliseconds apart each see the other's lock and *both* retreat. Backing
  # off by a flat interval means they wake together and collide again, indefinitely, without
  # either doing work. Jitter breaks that symmetry. It does not fix the underlying missing
  # tie-break — see #another_run_in_progress? — it just stops the failure from repeating in
  # lockstep, which matters more now that re-arming puts more rows in the queue.
  REQUEUE_JITTER = 5.minutes

  # Fraction of +Delayed::Worker.max_run_time+ a single run may spend before it stops and
  # requeues a continuation.
  #
  # It has to stay below 1.0, and the budget has to be derived from max_run_time rather than
  # written as a literal duration. Once a run passes max_run_time two things happen at once:
  # delayed_job considers the row abandoned and lets a second worker reserve and re-execute it,
  # and #another_run_in_progress? starts reading this job's own lock as stale — so the guard
  # silently stops serialising and two runs hammer PubChem together. That is the opposite of
  # what the guard exists for, and it is reachable purely by tuning max_run_time down or a
  # chunk size up, with nothing to connect the two.
  RUN_BUDGET_RATIO = 0.9

  # PubChem's request-volume policy is ~5/s. This paces *every* request, not every molecule:
  # a molecule needing both halves costs two round trips, and since this job now carries all
  # of the application's PubChem traffic, sleeping once per molecule would let a two-call
  # molecule burst at twice the intended rate.
  # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
  SLEEP_BETWEEN_REQUESTS = 0.5

  # Max molecules per invocation before requeuing a continuation. The run is also bounded by
  # #run_deadline, whichever comes first.
  CHUNK_SIZE = 1000

  # How long to wait before looking again when the pending set is empty but an import is still
  # creating molecules. Short relative to how long a bulk import takes to produce a batch —
  # measured at ~7 minutes per 50-record SDF batch — so enrichment stays close behind the
  # import rather than waiting for it to finish.
  REARM_DELAY = 60.seconds

  # Ceiling on consecutive empty re-arms. Without it, an import whose delayed_jobs lock is
  # somehow never released would keep this chain alive indefinitely. At REARM_DELAY this is
  # ~30 minutes of idling, after which the importer's own end-of-run flush
  # ({Molecule.schedule_pubchem_lookup_since}) is left to cover whatever remains — that flush is
  # the actual completeness guarantee, and nothing here is allowed to become load-bearing for it.
  MAX_EMPTY_REARMS = 30

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
  # @param empty_rearms [Integer] how many consecutive times this chain has already found
  #   nothing pending and re-armed anyway because an import was still running. Carried as an
  #   argument rather than persisted, and capped by {MAX_EMPTY_REARMS}.
  #
  # With neither +ids+ nor +created_after+ this is the global sweep: every molecule still
  # missing PubChem data. That is the cron mode, and it is why the callers
  # ({Molecule.schedule_pubchem_lookup_for}, {.schedule_pubchem_lookup_since}) return early on
  # blank input themselves rather than relying on a guard here — an accidental argument-less
  # enqueue from those paths would otherwise silently become a full backfill.
  # rubocop:disable Metrics/ParameterLists -- ActiveJob entry point: each argument is serialized
  # into the queue row individually, so collapsing them into an options hash would change the
  # payload shape of every already-queued job as well as every call site.
  def perform(ids = nil, type: :molecules, created_after: nil,
              chunk_size: CHUNK_SIZE, start_id: 0, empty_rearms: 0)
    # The argument set both requeue paths forward, bundled once so the two stay in step.
    forward = { type: type, created_after: created_after, chunk_size: chunk_size, start_id: start_id }

    return requeue_after_collision(ids, **forward) if another_run_in_progress?

    molecule_ids = resolve_ids(ids, type)
    # A non-empty sample list can resolve to no molecules at all — samples.molecule_id is
    # nullable. That is an empty *targeted* set, not the global sweep: pending_scope applies
    # its id filter only `if ids.present?`, so passing [] through would silently drop the
    # filter and backfill a chunk of arbitrary molecules, with continue_after requeuing to
    # keep going. Distinguish "asked for nothing" from "asked for everything" here, since
    # pending_scope cannot.
    return if ids.present? && molecule_ids.blank?

    molecules = resolve_molecules(molecule_ids, created_after: created_after,
                                                start_id: start_id, chunk_size: chunk_size)
    return rearm_while_importing(ids, empty_rearms: empty_rearms, **forward) if molecules.empty?

    # enrich_each returns the last molecule it actually reached, which is not necessarily the
    # last of the chunk — see its note on the run budget.
    continue_after(enrich_each(molecules).id, molecule_ids,
                   created_after: created_after, chunk_size: chunk_size)
  end
  # rubocop:enable Metrics/ParameterLists

  private

  # Another run of this job holds the guard — retry after the standard backoff rather than
  # competing for the same request budget.
  def requeue_after_collision(ids, **forward)
    self.class.set(wait: collision_backoff).perform_later(ids, **forward)
  end

  # @return [ActiveSupport::Duration] REQUEUE_DELAY plus up to REQUEUE_JITTER, so colliding
  #   runs do not wake in lockstep and collide again
  def collision_backoff
    REQUEUE_DELAY + rand(REQUEUE_JITTER.to_i).seconds
  end

  # Nothing pending *right now* does not mean nothing is coming. A bulk import commits its
  # molecules in batches, and enrichment drains a batch far faster than the import produces the
  # next one — measured at roughly 8x — so a chain that stopped here would enrich the first
  # batch and then leave everything created over the rest of the import stranded until the
  # importer's end-of-run flush, which is exactly the latency this re-arm exists to remove.
  #
  # Re-arming rather than enqueuing per batch is what keeps this bounded: one job stays alive
  # regardless of import size. Enqueuing from the import loop instead would put a job in the
  # queue per batch — 1000 of them for a 50k-molecule import, which is the shape of a defect
  # already fixed once in this work.
  #
  # @return [void]
  def rearm_while_importing(ids, empty_rearms:, **forward)
    return if empty_rearms >= MAX_EMPTY_REARMS
    return unless import_in_progress?

    self.class.set(wait: REARM_DELAY)
        .perform_later(ids, **forward, empty_rearms: empty_rearms + 1)
  end

  # Whether a bulk import is currently running, judged the same way #another_run_in_progress?
  # judges its own siblings: a delayed_jobs row for the class, holding a lock that is not stale.
  #
  # Deliberately no new state. Reusing the +locked_at+ window makes the re-arm self-limiting —
  # if the importing worker dies, its lock ages past Delayed::Worker.max_run_time and this goes
  # false on its own, so there is no flag that can leak and no loop that can outlive its cause.
  #
  # Caveat worth knowing: a large SDF import can run longer than max_run_time, at which point
  # its lock reads as stale here even though it is still going. The re-arm then stops early and
  # the end-of-run flush covers the remainder — degraded, not broken.
  #
  # @return [Boolean]
  def import_in_progress?
    Delayed::Job.where('handler like ?', '%job_class: ImportSamplesJob%')
                .exists?(locked_at: Delayed::Worker.max_run_time.ago..)
  end

  # @return [Array<Integer>, nil] molecule ids — +ids+ as given, or the molecule ids they
  #   reference when the caller passed sample ids
  def resolve_ids(ids, type)
    return ids unless ids.present? && type.to_sym == :samples

    resolve_sample_molecule_ids(ids)
  end

  # Enriches the chunk, stopping early if the run budget is spent.
  #
  # chunk_size alone does not bound wall-clock time: at the default 1000 this is 1000 sleeps
  # plus up to two PubChem round trips each, which can outlast Delayed::Worker.max_run_time —
  # after which delayed_job re-reserves the row for a second worker and the rate-limit guard
  # reads this job's own lock as stale, so every PubChem job runs at once. Stopping on the
  # deadline and letting continue_after requeue keeps the rotation intact either way.
  #
  # @return [Molecule] the last molecule actually enriched, i.e. where a continuation resumes
  def enrich_each(molecules)
    t_limit = run_deadline
    last = molecules.first

    molecules.each do |molecule|
      enrich_and_fetch_lcss(molecule)
      last = molecule
      break if Time.zone.now > t_limit
    end

    last
  end

  # Picks up where this run stopped when +chunk_size+ cut the pending set short.
  def continue_after(last_id, molecule_ids, created_after:, chunk_size:)
    return unless more_pending?(molecule_ids, created_after: created_after, after_id: last_id)

    # No wait — this isn't a collision backoff, just more work to continue with.
    self.class.perform_later(molecule_ids, type: :molecules, created_after: created_after,
                                           chunk_size: chunk_size, start_id: last_id)
  end

  # Does whichever half of the work is outstanding, and only that half.
  #
  # pending_scope filters on pubchem_lcss being unset, not on cid, so a molecule arrives here
  # either needing both (no cid yet — what PubchemCidJob used to select) or only the LCSS fetch
  # (cid already known — what PubchemLcssJob used to select). Skipping the molecule-info fetch
  # when a cid exists also avoids Molecule#pubchem_lcss re-asking PubChem the same "does this
  # inchikey resolve?" question enrich_from_pubchem just answered.
  #
  # Each branch is paced, so a molecule needing both costs two spaced requests rather than a
  # burst of two.
  def enrich_and_fetch_lcss(molecule)
    unless molecule.pubchem_check
      throttle
      molecule.enrich_from_pubchem
    end
    return unless molecule.pubchem_check

    throttle
    molecule.pubchem_lcss
  end

  # Spaces outbound PubChem requests. Extracted so the pacing is per *request*, which is what
  # PubChem's policy counts.
  #
  # Also where this job releases its AR connection. Called immediately before every HTTP round
  # trip (see #enrich_and_fetch_lcss), so together the sleep and the request that follows can
  # leave the connection idle for 21s+ per molecule, for up to this job's whole run budget (see
  # RUN_BUDGET_RATIO) -- worst case tens of minutes on one checked-out connection doing nothing.
  # Releasing it here means a connection dropped/reaped during that idle window is simply
  # re-checked-out on the next query instead of poisoning the worker with PG::ConnectionBad.
  def throttle
    ActiveRecord::Base.connection_pool.release_connection
    sleep SLEEP_BETWEEN_REQUESTS
  end

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

  # @return [ActiveSupport::TimeWithZone] when the current run must stop, leaving enough of
  #   +Delayed::Worker.max_run_time+ spare to finish the molecule in flight and requeue.
  def run_deadline
    (Delayed::Worker.max_run_time * RUN_BUDGET_RATIO).from_now
  end

  # Concurrency guard. This is the only job that calls PubChem, but it can still race itself:
  # cron ticks, self-requeued continuations and per-molecule enqueues all overlap.
  #
  # Matching is textual, against the serialized handler, because that is the only place a
  # delayed_job row records what it is. A lock older than +Delayed::Worker.max_run_time+ is
  # stale — its worker died without releasing it — and is treated as not running, so a crashed
  # worker cannot block every future run forever.
  #
  # @return [Boolean] whether a worker currently holds the lock on another run of this job
  def another_run_in_progress?
    Delayed::Job.where('handler like ?', "%job_class: #{self.class.name}%")
                .where(locked_at: Delayed::Worker.max_run_time.ago..)
                .where.not('handler like ?', "%job_id: #{job_id}%")
                .exists?
  end

  def pending_scope(ids, created_after:, after_id:)
    # eager_load(:tag) is a LEFT OUTER JOIN, so a molecule with no element_tags row at
    # all would otherwise also match `... is null` below and crash Molecule#pubchem_lcss,
    # which assumes tag is present. Exclude those explicitly.
    scope = Molecule.eager_load(:tag)
                    .where.not(element_tags: { id: nil })
                    # A partial (R-group) molecule's formula has had its fictitious CH3
                    # stripped and its inchikey describes a fragment, so PubChem has nothing
                    # to say about it. PubchemCidJob excluded these; keep that.
                    .where(is_partial: false)
                    # The decoupled-sample placeholder is not a structure. Molecule#enrichable?
                    # excludes it on the request path; excluded here too so the two agree, and
                    # so a DUMMY row created before Molecule.find_or_create_dummy started
                    # deferring does not keep costing a lookup for the literal string.
                    .where.not(inchikey: 'DUMMY')
                    .where("element_tags.taggable_data->>'pubchem_lcss' is null")
                    # Skip structures PubChem has already told us it has no record for, until
                    # the answer goes stale — otherwise every sweep re-asks the same question
                    # about every in-house compound, forever.
                    #
                    # CASE, not `is null or (...)::timestamptz < ?`. taggable_data is free-form
                    # JSON that other writers touch, so an unparseable value is reachable, and
                    # casting one raises PG::InvalidDatetimeFormat — which fails the whole query,
                    # not just that row, so a single bad value anywhere stops enrichment for
                    # every molecule. Postgres may reorder the arms of an OR, so guarding the
                    # cast that way is not enough; CASE is evaluated in order.
                    #
                    # An unreadable stamp means "treat as never asked", matching
                    # Molecule#pubchem_checked_recently? — the two must agree or a molecule can
                    # be enrichable on the request path and invisible to the sweep. The regex is
                    # a cheap plausibility check, not validation: anything it lets through that
                    # still will not cast is a value no writer in this codebase can produce.
                    .where(
                      "case when element_tags.taggable_data->>'pubchem_checked_at' ~ " \
                      "'^\\d{4}-\\d{2}-\\d{2}' " \
                      "then (element_tags.taggable_data->>'pubchem_checked_at')::timestamptz < ? " \
                      'else true end',
                      Molecule::PUBCHEM_MISS_TTL.ago,
                    )
                    .where('molecules.id > ?', after_id)
                    .order(:id)
    scope = scope.where(id: ids) if ids.present?
    scope = scope.where('molecules.created_at > ?', created_after) if created_after.present?
    scope
  end
end
