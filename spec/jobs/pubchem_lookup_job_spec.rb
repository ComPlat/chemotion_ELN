# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PubchemLookupJob do
  let(:job) { described_class.new }

  describe '#perform' do
    # let! so these are created while Rails.env.test? is still genuinely true —
    # PubChem.http_s (lib/pub_chem.rb:11) also branches on Rails.env.test?, and
    # stubbing it globally (see below) before molecule creation would flip that
    # unrelated branch too and break the molecule factory's own tag callback.
    let!(:first_molecule) { create(:molecule) }
    let!(:second_molecule) { create(:molecule) }
    let!(:third_molecule) { create(:molecule) }

    before do
      # PubChem.http_s (lib/pub_chem.rb:11) branches on Rails.env.test?, which is why the
      # molecules above are created before this stub takes effect. The job body itself is no
      # longer gated on the environment — it has to be exercisable end to end, since it is the
      # only PubChem job — so nothing here lifts a gate; the network is kept out by stubbing
      # #enrich_from_pubchem and #pubchem_lcss per example.
      allow(Rails.env).to receive(:test?).and_return(false)
      allow(job).to receive(:sleep)
    end

    # Simulates a successful PubChem molecule-info fetch: real enrich_from_pubchem persists
    # the cid via Molecule#assign_pubchem_names_and_cid!, which is exactly what flips
    # Molecule#pubchem_check from false to true for the perform loop's second gate.
    def stub_successful_enrich(molecule, cid: 643_785)
      allow(molecule).to receive(:enrich_from_pubchem) do
        molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => cid))
      end
    end

    # No ids and no created_after is the cron sweep, not a no-op: it is how the global backfill
    # runs now that PubchemCidJob and PubchemLcssJob are folded in.
    it 'sweeps every pending molecule when given neither ids nor created_after' do
      allow(job).to receive(:more_pending?).and_return(false)
      [first_molecule, second_molecule, third_molecule].each do |m|
        allow(Molecule).to receive(:find_by).with(id: m.id).and_return(m)
      end

      expect(job.send(:pending_scope, nil, created_after: nil, after_id: 0))
        .to include(first_molecule, second_molecule, third_molecule)
    end

    it 'calls #pubchem_lcss on each resolved molecule in order' do
      allow(job).to receive_messages(resolve_molecules: [first_molecule, second_molecule], more_pending?: false)
      stub_successful_enrich(first_molecule)
      stub_successful_enrich(second_molecule)
      allow(first_molecule).to receive(:pubchem_lcss)
      allow(second_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id, second_molecule.id])

      expect(first_molecule).to have_received(:pubchem_lcss).ordered
      expect(second_molecule).to have_received(:pubchem_lcss).ordered
    end

    it 'enriches each molecule from PubChem before fetching its LCSS' do
      allow(job).to receive_messages(resolve_molecules: [first_molecule], more_pending?: false)
      stub_successful_enrich(first_molecule)
      allow(first_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id])

      expect(first_molecule).to have_received(:enrich_from_pubchem).ordered
      expect(first_molecule).to have_received(:pubchem_lcss).ordered
    end

    it 'skips the enrich fetch when the molecule already has a cid (e.g. from PubchemCidJob)' do
      first_molecule.tag.update!(taggable_data: first_molecule.tag.taggable_data.merge('pubchem_cid' => 643_785))
      allow(job).to receive_messages(resolve_molecules: [first_molecule], more_pending?: false)
      allow(first_molecule).to receive(:enrich_from_pubchem)
      allow(first_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id])

      expect(first_molecule).not_to have_received(:enrich_from_pubchem)
      expect(first_molecule).to have_received(:pubchem_lcss)
    end

    it 'skips the LCSS fetch when enrichment does not find a cid, instead of falling back to its own lookup' do
      allow(job).to receive_messages(resolve_molecules: [first_molecule], more_pending?: false)
      allow(first_molecule).to receive(:enrich_from_pubchem) # no-op: PubChem had nothing for this inchikey
      allow(first_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id])

      expect(first_molecule).to have_received(:enrich_from_pubchem)
      expect(first_molecule).not_to have_received(:pubchem_lcss)
    end

    # Pacing is per *request*, not per molecule: PubChem's policy counts requests, and a
    # molecule needing both halves costs two. Sleeping once per molecule would let such a
    # molecule burst at twice the intended rate.
    it 'sleeps before every PubChem request, not once per molecule' do
      allow(job).to receive_messages(resolve_molecules: [first_molecule], more_pending?: false)
      stub_successful_enrich(first_molecule)
      allow(first_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id])

      # one molecule, two requests (enrich then LCSS) -> two sleeps
      expect(job).to have_received(:sleep).with(described_class::SLEEP_BETWEEN_REQUESTS).twice
    end

    it 'sleeps once for a molecule that only needs the LCSS half' do
      first_molecule.tag.update!(taggable_data: first_molecule.tag.taggable_data.merge('pubchem_cid' => 643_785))
      allow(job).to receive_messages(resolve_molecules: [first_molecule], more_pending?: false)
      allow(first_molecule).to receive_messages(enrich_from_pubchem: nil, pubchem_lcss: nil)

      job.perform([first_molecule.id])

      expect(first_molecule).not_to have_received(:enrich_from_pubchem)
      expect(job).to have_received(:sleep).with(described_class::SLEEP_BETWEEN_REQUESTS).once
    end

    it 'skips an id that no longer exists without raising' do
      missing_id = first_molecule.id
      first_molecule.destroy!

      expect { job.perform([missing_id]) }.not_to raise_error
    end

    it 'does not re-fetch LCSS data for a molecule that already has it (idempotent retry)' do
      first_molecule.tag.update!(
        taggable_data: first_molecule.tag.taggable_data.merge(
          'pubchem_cid' => 643_785, 'pubchem_lcss' => 'already fetched',
        ),
      )
      allow(Chemotion::PubchemService).to receive(:lcss_from_cid)

      job.perform([first_molecule.id])

      expect(Chemotion::PubchemService).not_to have_received(:lcss_from_cid)
    end

    context 'when another guarded PubChem job is currently running' do
      it 'requeues itself later without resolving or processing any molecules' do
        create_locked_delayed_job('PubchemLookupJob', job_id: 'other-instance')
        allow(job).to receive(:resolve_molecules)
        allow(described_class).to receive(:set).and_return(described_class)
        allow(described_class).to receive(:perform_later)

        job.perform([first_molecule.id])

        # A range, not the bare constant: the backoff carries jitter so two runs that collided
        # do not wake together and collide again.
        expect(described_class).to have_received(:set).with(
          wait: a_value_between(described_class::REQUEUE_DELAY,
                                described_class::REQUEUE_DELAY + described_class::REQUEUE_JITTER),
        )
        expect(described_class).to have_received(:perform_later).with(
          [first_molecule.id], type: :molecules, created_after: nil,
                               chunk_size: described_class::CHUNK_SIZE, start_id: 0
        )
        expect(job).not_to have_received(:resolve_molecules)
      end

      # Without jitter the guard's missing tie-break repeats in lockstep: both runs retreat by
      # exactly 15 minutes, wake together, collide again, and neither ever does work.
      it 'spreads the backoff so colliding runs do not wake in lockstep' do
        create_locked_delayed_job('PubchemLookupJob', job_id: 'other-instance')
        allow(job).to receive(:resolve_molecules)
        waits = Array.new(20) { job.send(:collision_backoff) }

        expect(waits.uniq.size).to be > 1
        expect(waits).to all(be_between(described_class::REQUEUE_DELAY,
                                        described_class::REQUEUE_DELAY + described_class::REQUEUE_JITTER))
      end
    end

    context 'when the run budget is spent before the chunk is' do
      # chunk_size alone does not bound wall-clock time: 1000 molecules x (a sleep + up to two
      # PubChem round trips) can outlast Delayed::Worker.max_run_time, after which delayed_job
      # re-reserves the row and the guard reads this job's own lock as stale.
      it 'stops early and requeues from the last molecule it actually reached' do
        called_ids = []
        allow_any_instance_of(Molecule).to receive(:enrich_from_pubchem) do |instance| # rubocop:disable RSpec/AnyInstance
          instance.tag.update!(taggable_data: instance.tag.taggable_data.merge('pubchem_cid' => 643_785))
        end
        allow_any_instance_of(Molecule).to receive(:pubchem_lcss) { |instance| called_ids << instance.id } # rubocop:disable RSpec/AnyInstance
        allow(described_class).to receive(:perform_later)
        allow(job).to receive(:run_deadline).and_return(1.second.ago)

        job.perform([first_molecule.id, second_molecule.id, third_molecule.id])

        expect(called_ids).to contain_exactly(first_molecule.id)
        expect(described_class).to have_received(:perform_later)
          .with(anything, hash_including(start_id: first_molecule.id))
      end
    end

    context 'when more pending molecules exist than chunk_size allows in one run' do
      it 'bounds a single run to chunk_size molecules and requeues a follow-up with the resume cursor' do
        called_ids = []
        # The job re-queries its own molecules from the DB, so stubbing a specific
        # test object's #pubchem_lcss wouldn't be seen — stub the class instead.
        allow_any_instance_of(Molecule).to receive(:enrich_from_pubchem) do |instance| # rubocop:disable RSpec/AnyInstance
          instance.tag.update!(taggable_data: instance.tag.taggable_data.merge('pubchem_cid' => 643_785))
        end
        allow_any_instance_of(Molecule).to receive(:pubchem_lcss) { |instance| called_ids << instance.id } # rubocop:disable RSpec/AnyInstance
        allow(described_class).to receive(:perform_later)

        job.perform([first_molecule.id, second_molecule.id, third_molecule.id], chunk_size: 2)

        expect(called_ids).to contain_exactly(first_molecule.id, second_molecule.id)
        expect(described_class).to have_received(:perform_later).with(
          [first_molecule.id, second_molecule.id, third_molecule.id], type: :molecules, created_after: nil,
                                                                      chunk_size: 2, start_id: second_molecule.id
        )
      end

      it 'does not requeue once every given molecule has been processed' do
        allow_any_instance_of(Molecule).to receive(:enrich_from_pubchem) do |instance| # rubocop:disable RSpec/AnyInstance
          instance.tag.update!(taggable_data: instance.tag.taggable_data.merge('pubchem_cid' => 643_785))
        end
        allow_any_instance_of(Molecule).to receive(:pubchem_lcss) # rubocop:disable RSpec/AnyInstance
        allow(described_class).to receive(:perform_later)

        job.perform([first_molecule.id, second_molecule.id])

        expect(described_class).not_to have_received(:perform_later)
      end
    end
  end

  # Coverage migrated from the deleted pubchem_cid_job_spec.rb and pubchem_lcss_job_spec.rb:
  # the pending scope here has to be a superset of the two scopes they each swept.
  describe 'the sweep scope (formerly PubchemCidJob and PubchemLcssJob)' do
    def scope_for(job)
      job.send(:pending_scope, nil, created_after: nil, after_id: 0)
    end

    def strip_cid(molecule)
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))
      molecule
    end

    # PubchemCidJob's set: molecules with no cid.
    it 'includes a molecule that still needs its cid' do
      molecule = strip_cid(create(:molecule))

      expect(scope_for(job)).to include(molecule)
    end

    # PubchemLcssJob's set: molecules that already have a numeric cid but no LCSS tag.
    it 'includes a molecule that only still needs its LCSS' do
      molecule = create(:molecule)
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => 643_785))

      expect(scope_for(job)).to include(molecule)
    end

    it 'excludes a molecule that already has its LCSS' do
      molecule = create(:molecule)
      molecule.tag.update!(
        taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => 643_785, 'pubchem_lcss' => 'done'),
      )

      expect(scope_for(job)).not_to include(molecule)
    end

    # PubchemCidJob required joins(:samples), so a molecule with none had no enrichment path at
    # all — it was in neither sweep. Folding the jobs together is what finally covers it.
    it 'includes a molecule with no sample, which PubchemCidJob could never reach' do
      molecule = strip_cid(create(:molecule))

      expect(molecule.samples).to be_empty
      expect(scope_for(job)).to include(molecule)
    end

    # PubchemCidJob's one filter worth keeping: a partial molecule's formula is CH3-stripped
    # and its inchikey describes a fragment, so PubChem has nothing to say about it.
    it 'excludes a partial molecule' do
      molecule = strip_cid(create(:molecule, is_partial: true))

      expect(scope_for(job)).not_to include(molecule)
    end

    # PubchemCidJob's batched endpoint returns only the records that matched, so it could never
    # tell "PubChem has nothing" from "not in this response" and never stamped a miss. The
    # per-molecule path can, which is why the consolidated sweep stops re-asking.
    # The decoupled-sample placeholder is not a structure. Molecule#enrichable? already excluded
    # it on the request path; without this the sweep sent the literal string to PubChem.
    it 'excludes the DUMMY placeholder' do
      dummy = create(:molecule, inchikey: 'DUMMY')

      expect(job.send(:pending_scope, nil, created_after: nil, after_id: 0)).not_to include(dummy)
    end

    # taggable_data is free-form JSON that other writers touch, so an unparseable stamp is
    # reachable. Casting one raises PG::InvalidDatetimeFormat, which fails the whole query rather
    # than that row — so a single bad value anywhere used to stop enrichment for every molecule.
    it 'survives an unparseable pubchem_checked_at anywhere in the table', :aggregate_failures do
      corrupt = create(:molecule)
      corrupt.tag.update!(taggable_data: corrupt.tag.taggable_data.merge('pubchem_checked_at' => 'nonsense'))
      healthy = create(:molecule)
      healthy.tag.update!(taggable_data: healthy.tag.taggable_data.except('pubchem_cid', 'pubchem_lcss'))

      scope = job.send(:pending_scope, nil, created_after: nil, after_id: 0)

      expect { scope.to_a }.not_to raise_error
      expect(scope).to include(healthy)
      # unreadable means "never asked", matching Molecule#pubchem_checked_recently?
      expect(scope).to include(corrupt)
    end

    it 'excludes a molecule PubChem has recently confirmed it has no record for' do
      molecule = strip_cid(create(:molecule))
      molecule.tag.update!(
        taggable_data: molecule.tag.taggable_data.merge('pubchem_checked_at' => 1.day.ago.iso8601),
      )

      expect(scope_for(job)).not_to include(molecule)
    end
  end

  describe '#resolve_sample_molecule_ids' do
    let!(:molecule) { create(:molecule) }
    let!(:sample) { create(:sample, molecule: molecule) }
    let!(:sample_without_molecule) do
      create(:sample, molecule: molecule).tap { |s| s.update_column(:molecule_id, nil) } # rubocop:disable Rails/SkipsModelValidations
    end

    it 'resolves sample ids to their distinct referenced molecule ids, dropping samples with no molecule' do
      result = job.send(:resolve_sample_molecule_ids, [sample.id, sample_without_molecule.id])

      expect(result).to eq([molecule.id])
    end

    # A targeted run that resolves to nothing must do nothing. pending_scope applies its id
    # filter only `if ids.present?`, so an empty resolved list would drop the filter entirely
    # and turn a request about one sample into a chunk of arbitrary molecules, with
    # continue_after requeuing to keep going.
    it 'does no work when the given samples resolve to no molecules at all', :aggregate_failures do
      allow(job).to receive(:resolve_molecules)
      allow(described_class).to receive(:perform_later)

      job.perform([sample_without_molecule.id], type: :samples)

      expect(job).not_to have_received(:resolve_molecules)
      expect(described_class).not_to have_received(:perform_later)
    end

    it 'still sweeps globally when given no ids at all' do
      allow(job).to receive(:resolve_molecules).and_return([])

      job.perform

      expect(job).to have_received(:resolve_molecules)
    end
  end

  describe '#resolve_molecules and #more_pending?' do
    let!(:old_molecule) { create(:molecule, created_at: 2.days.ago) }
    let!(:new_molecule) { create(:molecule, created_at: 1.minute.ago) }

    it 'scopes to the given molecule ids' do
      result = job.send(:resolve_molecules, [old_molecule.id], created_after: nil, start_id: 0)

      expect(result.map(&:id)).to eq([old_molecule.id])
    end

    it 'filters by created_after alone when ids is blank' do
      result = job.send(:resolve_molecules, nil, created_after: 1.hour.ago, start_id: 0)

      expect(result.map(&:id)).to eq([new_molecule.id])
    end

    it 'AND-combines ids with created_after, narrowing rather than extending the set' do
      result = job.send(
        :resolve_molecules, [old_molecule.id, new_molecule.id], created_after: 1.hour.ago, start_id: 0
      )

      expect(result.map(&:id)).to eq([new_molecule.id])
    end

    it 'excludes molecules a competing job already finished, even when explicitly given by id' do
      old_molecule.tag.update!(taggable_data: old_molecule.tag.taggable_data.merge('pubchem_lcss' => 'already fetched'))

      result = job.send(:resolve_molecules, [old_molecule.id, new_molecule.id], created_after: nil, start_id: 0)

      expect(result.map(&:id)).to eq([new_molecule.id])
    end

    it 'excludes a molecule with no tag row at all (orphaned data), instead of crashing downstream' do
      new_molecule.tag.destroy!

      result = job.send(:resolve_molecules, nil, created_after: 2.days.ago - 1.hour, start_id: 0)

      expect(result.map(&:id)).to eq([old_molecule.id])
    end

    it 'only considers molecules with id greater than start_id' do
      result = job.send(:resolve_molecules, nil, created_after: 2.days.ago - 1.hour, start_id: old_molecule.id)

      expect(result.map(&:id)).to eq([new_molecule.id])
    end

    it 'bounds the result to chunk_size when given' do
      result = job.send(:resolve_molecules, nil, created_after: 2.days.ago - 1.hour, start_id: 0, chunk_size: 1)

      expect(result.map(&:id)).to eq([old_molecule.id])
    end

    describe '#more_pending?' do
      it 'is true when a pending molecule exists beyond after_id' do
        expect(job.send(:more_pending?, nil, created_after: 2.days.ago - 1.hour, after_id: old_molecule.id)).to be(true)
      end

      it 'is false when no pending molecule remains beyond after_id' do
        expect(job.send(:more_pending?, nil, created_after: 2.days.ago - 1.hour,
                                             after_id: new_molecule.id)).to be(false)
      end
    end
  end
end
