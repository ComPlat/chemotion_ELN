# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PubchemSingleLcssJob do
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
      allow(job).to receive(:resolve_molecules).and_return([first_molecule, second_molecule])
      allow(first_molecule).to receive(:pubchem_lcss)
      allow(second_molecule).to receive(:pubchem_lcss)

      job.perform([first_molecule.id, second_molecule.id])

      expect(first_molecule).to have_received(:pubchem_lcss).ordered
      expect(second_molecule).to have_received(:pubchem_lcss).ordered
    end

    it 'sleeps between requests but not before the first one' do
      allow(job).to receive(:resolve_molecules).and_return([first_molecule, second_molecule, third_molecule])
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
        expect(described_class).to have_received(:perform_later)
          .with([first_molecule.id], type: :molecules, created_after: nil)
        expect(job).not_to have_received(:resolve_molecules)
      end
    end
  end

  describe '#resolve_molecules' do
    let!(:old_molecule) { create(:molecule, created_at: 2.days.ago) }
    let!(:new_molecule) { create(:molecule, created_at: 1.minute.ago) }
    let!(:sample) { create(:sample, molecule: new_molecule) }

    it 'scopes to the given molecule ids when type: :molecules' do
      result = job.send(:resolve_molecules, [old_molecule.id], type: :molecules, created_after: nil)

      expect(result.pluck(:id)).to eq([old_molecule.id])
    end

    it 'resolves sample ids to their distinct referenced molecule ids when type: :samples' do
      result = job.send(:resolve_molecules, [sample.id], type: :samples, created_after: nil)

      expect(result.pluck(:id)).to eq([new_molecule.id])
    end

    it 'filters by created_after alone when ids is blank' do
      result = job.send(:resolve_molecules, nil, type: :molecules, created_after: 1.hour.ago)

      expect(result.pluck(:id)).to eq([new_molecule.id])
    end

    it 'AND-combines ids with created_after, narrowing rather than extending the set' do
      result = job.send(
        :resolve_molecules, [old_molecule.id, new_molecule.id], type: :molecules, created_after: 1.hour.ago
      )

      expect(result.pluck(:id)).to eq([new_molecule.id])
    end

    it 'excludes molecules a competing job already finished, even when explicitly given by id' do
      old_molecule.tag.update!(taggable_data: old_molecule.tag.taggable_data.merge('pubchem_lcss' => 'already fetched'))

      result = job.send(:resolve_molecules, [old_molecule.id, new_molecule.id], type: :molecules, created_after: nil)

      expect(result.pluck(:id)).to eq([new_molecule.id])
    end
  end
end
