# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PubchemLcssJob do
  let(:job) { described_class.new }
  let(:called_ids) { [] }

  def make_pending_molecule(cid: 643_785)
    molecule = create(:molecule)
    molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => cid))
    molecule
  end

  def make_done_molecule
    molecule = create(:molecule)
    molecule.tag.update!(
      taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => 643_785, 'pubchem_lcss' => 'done'),
    )
    molecule
  end

  # create(:molecule) is given a default pubchem_cid by a global WebMock stub
  # (spec/spec_helper.rb) — clear it to represent a molecule PubChem has no CID for.
  def make_molecule_without_cid
    molecule = create(:molecule)
    molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))
    molecule
  end

  before do
    allow(job).to receive(:sleep)
    # The job loads its own fresh Molecule instances from the DB, so stubbing a
    # specific test object's #pubchem_lcss wouldn't be seen — stub the class instead
    # and record which ids were actually touched.
    allow_any_instance_of(Molecule).to receive(:pubchem_lcss) { |instance| called_ids << instance.id } # rubocop:disable RSpec/AnyInstance
  end

  describe '#perform' do
    context 'when another guarded PubChem job is currently running' do
      it 'requeues itself later without processing any molecules' do
        create_locked_delayed_job('PubchemSingleLcssJob')
        make_pending_molecule
        allow(described_class).to receive(:set).and_return(described_class)
        allow(described_class).to receive(:perform_later)

        job.perform

        expect(described_class).to have_received(:set).with(wait: PubchemRateLimitGuard::REQUEUE_DELAY)
        expect(described_class).to have_received(:perform_later)
          .with(sleep_time: 10, batch_size: 50, chunk_size: described_class::CHUNK_SIZE, start_id: 0)
        expect(called_ids).to be_empty
      end

      it 'proceeds normally when the other lock is stale (its worker died mid-run)' do
        create_locked_delayed_job('PubchemSingleLcssJob', locked_at: (Delayed::Worker.max_run_time + 1.minute).ago)
        pending_molecule = make_pending_molecule
        allow(described_class).to receive(:set)

        job.perform

        expect(described_class).not_to have_received(:set)
        expect(called_ids).to contain_exactly(pending_molecule.id)
      end
    end

    it 'processes only molecules with a numeric pubchem_cid and no pubchem_lcss yet' do
      pending_molecule = make_pending_molecule
      make_done_molecule
      make_molecule_without_cid

      job.perform

      expect(called_ids).to contain_exactly(pending_molecule.id)
    end

    it 'resumes after start_id, only considering molecules with a higher id' do
      earlier = make_pending_molecule
      later = make_pending_molecule

      job.perform(start_id: earlier.id)

      expect(called_ids).to contain_exactly(later.id)
    end

    it 'bounds a single run to chunk_size molecules and requeues a follow-up with the resume cursor' do
      first = make_pending_molecule
      second = make_pending_molecule
      make_pending_molecule # beyond chunk_size, must not be touched this run
      allow(described_class).to receive(:set).and_return(described_class)
      allow(described_class).to receive(:perform_later)

      job.perform(chunk_size: 2, batch_size: 1)

      expect(called_ids).to contain_exactly(first.id, second.id)
      expect(described_class).to have_received(:set).with(wait: 10.seconds)
      expect(described_class).to have_received(:perform_later)
        .with(sleep_time: 10, batch_size: 1, chunk_size: 2, start_id: second.id)
    end

    it 'does not requeue once every pending molecule has been processed' do
      make_pending_molecule

      allow(described_class).to receive(:set)

      job.perform

      expect(described_class).not_to have_received(:set)
    end
  end
end
