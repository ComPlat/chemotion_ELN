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
      # The job's real body is gated behind `return if Rails.env.test?` so no
      # spec accidentally hits PubChem via a stray perform_now/worker run;
      # here we lift that gate deliberately to exercise the loop, while
      # stubbing #pubchem_lcss so nothing actually reaches the network.
      allow(Rails.env).to receive(:test?).and_return(false)
      allow(job).to receive(:sleep)
    end

    it 'does nothing when both ids and created_after are blank' do
      allow(job).to receive(:resolve_molecules)

      job.perform

      expect(job).not_to have_received(:resolve_molecules)
    end

    it 'calls #pubchem_lcss on each resolved molecule in order' do
      allow(job).to receive_messages(resolve_molecules: [first_molecule, second_molecule], more_pending?: false)
      allow(first_molecule).to receive(:pubchem_lcss)
      allow(second_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id, second_molecule.id])

      expect(first_molecule).to have_received(:pubchem_lcss).ordered
      expect(second_molecule).to have_received(:pubchem_lcss).ordered
    end

    it 'sleeps between requests but not before the first one' do
      allow(job).to receive_messages(
        resolve_molecules: [first_molecule, second_molecule, third_molecule], more_pending?: false,
      )
      [first_molecule, second_molecule, third_molecule].each { |m| allow(m).to receive(:pubchem_lcss) }

      job.perform([first_molecule.id, second_molecule.id, third_molecule.id])

      expect(job).to have_received(:sleep).with(described_class::SLEEP_BETWEEN_REQUESTS).twice
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
        create_locked_delayed_job('PubchemLcssJob')
        allow(job).to receive(:resolve_molecules)
        allow(described_class).to receive(:set).and_return(described_class)
        allow(described_class).to receive(:perform_later)

        job.perform([first_molecule.id])

        expect(described_class).to have_received(:set).with(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
        expect(described_class).to have_received(:perform_later).with(
          [first_molecule.id], type: :molecules, created_after: nil,
                               chunk_size: PubchemLcssJob::CHUNK_SIZE, start_id: 0
        )
        expect(job).not_to have_received(:resolve_molecules)
      end
    end

    context 'when more pending molecules exist than chunk_size allows in one run' do
      it 'bounds a single run to chunk_size molecules and requeues a follow-up with the resume cursor' do
        called_ids = []
        # The job re-queries its own molecules from the DB, so stubbing a specific
        # test object's #pubchem_lcss wouldn't be seen — stub the class instead.
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
        allow_any_instance_of(Molecule).to receive(:pubchem_lcss) # rubocop:disable RSpec/AnyInstance
        allow(described_class).to receive(:perform_later)

        job.perform([first_molecule.id, second_molecule.id])

        expect(described_class).not_to have_received(:perform_later)
      end
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
