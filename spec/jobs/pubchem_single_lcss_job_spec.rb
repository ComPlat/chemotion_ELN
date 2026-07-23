# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PubchemSingleLcssJob do
  # let! so these are created while Rails.env.test? is still genuinely true —
  # PubChem.http_s (lib/pub_chem.rb:11) also branches on Rails.env.test?, and
  # stubbing it globally (see below) before molecule creation would flip that
  # unrelated branch too and break the molecule factory's own tag callback.
  let!(:first_molecule) { create(:molecule) }
  let!(:second_molecule) { create(:molecule) }
  let!(:third_molecule) { create(:molecule) }
  let(:job) { described_class.new }

  before do
    # The job's real body is gated behind `return if Rails.env.test?` so no
    # spec accidentally hits PubChem via a stray perform_now/worker run;
    # here we lift that gate deliberately to exercise the loop, while
    # stubbing #pubchem_lcss so nothing actually reaches the network.
    allow(Rails.env).to receive(:test?).and_return(false)
    allow(job).to receive(:sleep)
  end

  it 'calls #pubchem_lcss on each molecule in order' do
    allow(Molecule).to receive(:find_by).with(id: first_molecule.id).and_return(first_molecule)
    allow(Molecule).to receive(:find_by).with(id: second_molecule.id).and_return(second_molecule)
    [first_molecule, second_molecule].each do |m|
      allow(m).to receive(:enrich_from_pubchem)
      allow(m).to receive(:pubchem_lcss)
    end

    job.perform([first_molecule.id, second_molecule.id])

    expect(first_molecule).to have_received(:pubchem_lcss).ordered
    expect(second_molecule).to have_received(:pubchem_lcss).ordered
  end

  it 'enriches each molecule from PubChem before fetching its LCSS' do
    allow(Molecule).to receive(:find_by).with(id: first_molecule.id).and_return(first_molecule)
    allow(first_molecule).to receive(:enrich_from_pubchem)
    allow(first_molecule).to receive(:pubchem_lcss)

    job.perform([first_molecule.id])

    expect(first_molecule).to have_received(:enrich_from_pubchem).ordered
    expect(first_molecule).to have_received(:pubchem_lcss).ordered
  end

  it 'sleeps between requests but not before the first one' do
    allow(Molecule).to receive(:find_by).and_return(first_molecule)
    allow(first_molecule).to receive(:enrich_from_pubchem)
    allow(first_molecule).to receive(:pubchem_lcss)

    job.perform([first_molecule.id, second_molecule.id, third_molecule.id])

    expect(job).to have_received(:sleep).with(described_class::SLEEP_BETWEEN_REQUESTS).twice
  end

  it 'skips an id that no longer exists without raising' do
    missing_id = first_molecule.id
    first_molecule.destroy!

    expect { job.perform([missing_id]) }.not_to raise_error
  end

  it 'does not re-fetch LCSS data for a molecule that already has it (idempotent retry)' do
    tag = double(taggable_data: { 'pubchem_lcss' => 'already fetched' }, update: true) # rubocop:disable RSpec/VerifiedDoubles
    allow(Molecule).to receive(:find_by).with(id: first_molecule.id).and_return(first_molecule)
    allow(first_molecule).to receive_messages(cid: 643_785, tag: tag)
    allow(first_molecule).to receive(:enrich_from_pubchem)
    allow(Chemotion::PubchemService).to receive(:lcss_from_cid)

    job.perform([first_molecule.id])

    expect(Chemotion::PubchemService).not_to have_received(:lcss_from_cid)
  end
end
