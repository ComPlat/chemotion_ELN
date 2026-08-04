# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PubchemCidJob do
  let(:job) { described_class.new }

  # PubchemCidJob's scope requires an associated sample (joins(:samples)); a bare
  # create(:molecule) has none.
  def make_pending_molecule
    molecule = create(:molecule, iupac_name: nil)
    molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))
    create(:sample, molecule: molecule)
    molecule
  end

  def make_done_molecule(cid: 643_785)
    molecule = create(:molecule)
    molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => cid))
    create(:sample, molecule: molecule)
    molecule
  end

  def stub_pubchem_info_for(*molecules, cid: 643_785, iupac_name: 'water', names: %w[water])
    allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikeys) do |inchikeys|
      molecules.select { |m| inchikeys.include?(m.inchikey) }.map do |m|
        { inchikey: m.inchikey, cid: cid, iupac_name: iupac_name, names: names }
      end
    end
  end

  before { allow(job).to receive(:sleep) }

  describe '#perform' do
    context 'when another guarded PubChem job is currently running' do
      it 'requeues itself later without processing any molecules' do
        create_locked_delayed_job('PubchemLcssJob')
        pending = make_pending_molecule
        stub_pubchem_info_for(pending)
        allow(described_class).to receive(:set).and_return(described_class)
        allow(described_class).to receive(:perform_later)

        job.perform

        expect(described_class).to have_received(:set).with(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
        expect(described_class).to have_received(:perform_later)
          .with(sleep_time: 10, batch_size: 10, chunk_size: described_class::CHUNK_SIZE, start_id: 0)
        expect(pending.reload.tag.taggable_data['pubchem_cid']).to be_nil
      end

      it 'proceeds normally when the other lock is stale (its worker died mid-run)' do
        create_locked_delayed_job('PubchemLcssJob', locked_at: (Delayed::Worker.max_run_time + 1.minute).ago)
        pending = make_pending_molecule
        stub_pubchem_info_for(pending)
        allow(described_class).to receive(:set)

        job.perform

        expect(described_class).not_to have_received(:set)
        expect(pending.reload.tag.taggable_data['pubchem_cid']).to eq(643_785)
      end
    end

    it 'processes only molecules with a sample, is_partial: false, and no pubchem_cid yet' do
      pending = make_pending_molecule
      make_done_molecule
      stub_pubchem_info_for(pending)

      job.perform

      expect(pending.reload.tag.taggable_data['pubchem_cid']).to eq(643_785)
    end

    it 'persists iupac_name and molecule_names alongside the cid' do
      pending = make_pending_molecule
      stub_pubchem_info_for(pending, iupac_name: 'water', names: %w[water oxidane])

      job.perform

      pending.reload
      expect(pending.iupac_name).to eq('water')
      expect(pending.molecule_names.where(description: 'iupac_name').pluck(:name)).to include('water', 'oxidane')
    end

    it 'resumes after start_id, only considering molecules with a higher id' do
      earlier = make_pending_molecule
      later = make_pending_molecule
      stub_pubchem_info_for(earlier, later)

      job.perform(start_id: earlier.id)

      expect(earlier.reload.tag.taggable_data['pubchem_cid']).to be_nil
      expect(later.reload.tag.taggable_data['pubchem_cid']).to eq(643_785)
    end

    it 'bounds a single run to chunk_size molecules and requeues a follow-up with the resume cursor',
       :aggregate_failures do
      first = make_pending_molecule
      second = make_pending_molecule
      third = make_pending_molecule # beyond chunk_size, must not be touched this run
      stub_pubchem_info_for(first, second, third)
      allow(described_class).to receive(:set).and_return(described_class)
      allow(described_class).to receive(:perform_later)

      job.perform(chunk_size: 2, batch_size: 1)

      expect(first.reload.tag.taggable_data['pubchem_cid']).to eq(643_785)
      expect(second.reload.tag.taggable_data['pubchem_cid']).to eq(643_785)
      expect(third.reload.tag.taggable_data['pubchem_cid']).to be_nil
      expect(described_class).to have_received(:set).with(wait: 10.seconds)
      expect(described_class).to have_received(:perform_later)
        .with(sleep_time: 10, batch_size: 1, chunk_size: 2, start_id: second.id)
    end

    it 'does not requeue once every pending molecule has been processed' do
      pending = make_pending_molecule
      stub_pubchem_info_for(pending)
      allow(described_class).to receive(:set)

      job.perform

      expect(described_class).not_to have_received(:set)
    end

    context 'when chaining PubchemLcssJob' do
      before { allow(PubchemLcssJob).to receive(:perform_later) }

      it 'chains a full PubchemLcssJob sweep once the rotation has drained' do
        pending = make_pending_molecule
        stub_pubchem_info_for(pending)

        job.perform(start_id: 0)

        expect(PubchemLcssJob).to have_received(:perform_later).with(start_id: 0)
      end

      # Chaining per chunk enqueued one overlapping LCSS rotation per chunk. They are all
      # serialised by PubchemRateLimitGuard, so every one but the first spent its life
      # bouncing on the 15-minute REQUEUE_DELAY — and colliding with CID's own continuations.
      it 'does not chain while chunks remain, only after the last one' do
        earlier = make_pending_molecule
        later = make_pending_molecule
        stub_pubchem_info_for(earlier, later)

        job.perform(sleep_time: 0, batch_size: 1, chunk_size: 1, start_id: 0)

        expect(PubchemLcssJob).not_to have_received(:perform_later)
      end

      it 'chains even when this run enriched nothing (prior cid\'d-but-not-lcss\'d molecules may still be pending)' do
        job.perform

        expect(PubchemLcssJob).to have_received(:perform_later).with(start_id: 0)
      end

      it 'does not chain when the run backs off due to another guarded job running' do
        create_locked_delayed_job('PubchemLcssJob')

        job.perform

        expect(PubchemLcssJob).not_to have_received(:perform_later)
      end

      it 'does not chain when LCSS is explicitly disabled by config' do
        allow(ENV).to receive(:fetch).and_call_original
        allow(ENV).to receive(:fetch).with('CRON_CONFIG_PC_LCSS', nil).and_return('disabled')

        job.perform

        expect(PubchemLcssJob).not_to have_received(:perform_later)
      end
    end
  end
end
