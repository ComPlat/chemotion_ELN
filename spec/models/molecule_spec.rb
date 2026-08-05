# frozen_string_literal: true

# == Schema Information
#
# Table name: molecules
#
#  id                     :integer          not null, primary key
#  boiling_point          :float
#  cano_smiles            :string
#  cas                    :text
#  deleted_at             :datetime
#  density                :float            default(0.0)
#  exact_molecular_weight :float
#  inchikey               :string
#  inchistring            :string
#  is_partial             :boolean          default(FALSE), not null
#  iupac_name             :string
#  melting_point          :float
#  molecular_weight       :float
#  molecule_svg_file      :string
#  molfile                :binary
#  molfile_version        :string(20)
#  names                  :string           default([]), is an Array
#  sum_formular           :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_molecules_on_deleted_at                           (deleted_at)
#  index_molecules_on_formula_and_inchikey_and_is_partial  (inchikey,sum_formular,is_partial) UNIQUE
#
require 'rails_helper'
require 'digest'

RSpec.describe Molecule, type: :model do
  describe 'creation' do
    let(:molecule) { create(:molecule) }

    it 'is possible to create a valid molecule' do
      expect(molecule.valid?).to be(true)
    end

    it 'has a unique inchikey' do
      molecule.save!
      invalid_molecule = described_class.new
      invalid_molecule.inchikey = molecule.inchikey
      invalid_molecule.sum_formular = molecule.sum_formular
      invalid_molecule.is_partial = molecule.is_partial
      expect { invalid_molecule.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'defers the PubChem CID tag to async enrichment (not populated synchronously on create)' do
      molecule.save!
      expect(molecule.tag.taggable_data['pubchem_cid']).to be_nil
    end

    it 'backfills the PubChem CID tag idempotently via #assign_pubchem_names_and_cid!' do
      molecule.save!
      molecule.assign_pubchem_names_and_cid!(cid: '123456789', iupac_name: 'water', names: [])
      expect(molecule.reload.tag.taggable_data['pubchem_cid']).to eq('123456789')
    end

    it 'has molecule_names' do
      association_names = molecule.molecule_names.map(&:name)
      database_names    = molecule.names

      expect(association_names).to include molecule.sum_formular
      expect(database_names).to match_array(association_names.without(molecule.sum_formular))
    end
  end

  describe '#pubchem_lcss when PubChem has no GHS data' do
    let(:molecule) { create(:molecule) }

    before do
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => 643_785))
      allow(Chemotion::PubchemService).to receive(:lcss_from_cid).and_return(nil)
    end

    # A nil was stored as JSON null, which `taggable_data->>'pubchem_lcss' is null` matches
    # exactly like a missing key — so the molecule never left the pending scope and was
    # re-fetched on every sweep, forever.
    it 'records false rather than null so the molecule leaves the pending scope' do
      molecule.pubchem_lcss

      expect(molecule.reload.tag.taggable_data['pubchem_lcss']).to be false
      expect(PubchemLookupJob.new.send(:pending_scope, nil, created_after: nil, after_id: 0))
        .not_to include(molecule)
    end

    it 'does not re-fetch once it has recorded that there is none' do
      molecule.pubchem_lcss
      molecule.reload.pubchem_lcss

      expect(Chemotion::PubchemService).to have_received(:lcss_from_cid).once
    end
  end

  describe 'PubChem miss recording' do
    let(:molecule) { create(:molecule) }

    before do
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))
    end

    # Without this, an in-house compound is asked about forever: nothing is written, so the
    # molecule never leaves either job's pending scope and every sweep re-asks.
    it 'remembers a confirmed "PubChem has no record"' do
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: nil, iupac_name: nil, names: [] }, :not_found])

      molecule.enrich_from_pubchem

      expect(molecule.reload.tag.taggable_data['pubchem_checked_at']).to be_present
      expect(molecule.enrichable?).to be false
    end

    # :unavailable is a transport failure, not an answer. Remembering it would strand the
    # molecule unenriched for good.
    it 'does not remember a failure to reach PubChem' do
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: nil, iupac_name: nil, names: [] }, :unavailable])

      molecule.enrich_from_pubchem

      expect(molecule.reload.tag.taggable_data['pubchem_checked_at']).to be_nil
      expect(molecule.enrichable?).to be true
    end

    # PubChem can answer 200 with a Fault body, or with a record carrying no cid. That is still
    # "PubChem has nothing", and if it is not remembered the molecule never leaves
    # PubchemLookupJob's pending scope and costs a round trip on every sweep, forever.
    it 'remembers a 200 that carried no usable record' do
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: nil, iupac_name: nil, names: [] }, :ok])

      molecule.enrich_from_pubchem

      expect(molecule.reload.tag.taggable_data['pubchem_checked_at']).to be_present
      expect(molecule.enrichable?).to be false
    end

    # interpret_record returns a fully-keyed hash of nils for an empty response, so the old
    # `return if info.blank?` guard never fired and every miss ran the sample repoint plus a
    # full per-sample pg_search rebuild to write nothing.
    it 'does not rebuild sample search documents when PubChem had nothing', :aggregate_failures do
      create(:sample, molecule: molecule)
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: nil, iupac_name: nil, names: [] }, :not_found])
      allow(molecule).to receive(:refresh_samples_search_documents!)
      allow(molecule).to receive(:repoint_samples_to_iupac_name!)

      molecule.enrich_from_pubchem

      expect(molecule).not_to have_received(:refresh_samples_search_documents!)
      expect(molecule).not_to have_received(:repoint_samples_to_iupac_name!)
    end

    # The rebuild is the expensive part of assign_pubchem_names_and_cid! — one document load
    # and re-save per sample. Of everything that method writes, only iupac_name is read by a
    # Sample multisearchable field, so it is the only one that can stale a document.
    it 'rebuilds them when the IUPAC name actually lands' do
      unnamed = create(:molecule, iupac_name: nil, names: [])
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: 962, iupac_name: 'cubane', names: %w[cubane] }, :ok])
      allow(unnamed).to receive(:refresh_samples_search_documents!)

      unnamed.enrich_from_pubchem

      expect(unnamed).to have_received(:refresh_samples_search_documents!)
    end

    # Routine on the sweep path, not an edge case: pending_scope selects on pubchem_lcss being
    # unset, so molecules that already carry their cid and names are in the sweep by design.
    # Ungated, each one swept every sample of the molecule to write nothing.
    it 'does not rebuild them when the molecule was already named' do
      named = create(:molecule) # the factory sets iupac_name and names
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: 962, iupac_name: 'cubane', names: %w[cubane] }, :ok])
      allow(named).to receive(:refresh_samples_search_documents!)

      named.enrich_from_pubchem

      expect(named).not_to have_received(:refresh_samples_search_documents!)
    end

    # A record can carry a cid and no IUPAC Name prop. The cid is not indexed by any Sample
    # multisearchable field, so nothing about the document changed.
    it 'does not rebuild them for a cid-only response' do
      unnamed = create(:molecule, iupac_name: nil, names: [])
      allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
        .and_return([{ cid: 962, iupac_name: nil, names: [] }, :ok])
      allow(unnamed).to receive(:refresh_samples_search_documents!)

      unnamed.enrich_from_pubchem

      expect(unnamed).not_to have_received(:refresh_samples_search_documents!)
      expect(unnamed.reload.tag.taggable_data['pubchem_cid']).to eq(962)
    end

    it 'asks again once the answer goes stale' do
      molecule.tag.update!(
        taggable_data: molecule.tag.taggable_data.merge(
          'pubchem_checked_at' => (described_class::PUBCHEM_MISS_TTL + 1.day).ago.iso8601,
        ),
      )

      expect(molecule.reload.enrichable?).to be true
    end

    it 'treats an unparseable timestamp as never asked' do
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_checked_at' => 'nonsense'))

      expect(molecule.reload.enrichable?).to be true
    end
  end

  # #enrichable? gates the inline lookup on the molecule endpoints, and it has to agree with
  # PubchemLookupJob#pending_scope about what is worth asking — otherwise the request path pays
  # PubChem latency for questions the sweep would never ask, outside the rate-limit guard.
  describe '#enrichable? agrees with the job pending scope' do
    it 'excludes a partial (R-group) molecule, whose inchikey describes a fragment' do
      molecule = create(:molecule, is_partial: true)
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))

      expect(molecule.reload.enrichable?).to be false
    end

    # pending_scope excludes tag-less molecules explicitly (they can come from insert_all, a
    # migration, or a deleted tag row). The writers reached after a lookup have nothing to
    # record against, so this must be a false, not a NoMethodError on the request path.
    it 'excludes a molecule with no element_tags row instead of raising' do
      molecule = create(:molecule)
      molecule.tag.destroy!

      expect(molecule.reload.enrichable?).to be false
    end
  end

  describe '#cid' do
    let(:molecule) { create(:molecule) }

    it 'reads the tag' do
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.merge('pubchem_cid' => 962))

      expect(molecule.send(:cid)).to eq(962)
    end

    # The old `|| PubChem.get_cid_from_inchikey(inchikey)` fallback was unreachable from every
    # caller, and returned a String that get_lcss_from_cid rejects — a round trip for a value
    # guaranteed to be discarded. Both it and PubChem.get_cid_from_inchikey itself are gone, so
    # there is no longer a method to assert was not called.
    it 'returns nil when the tag has no cid' do
      molecule.tag.update!(taggable_data: molecule.tag.taggable_data.except('pubchem_cid'))

      expect(molecule.send(:cid)).to be_nil
    end
  end

  describe '#delete' do
    let(:molecule) { create(:molecule) }

    it 'deletes the molecule' do
      molecule.delete
      expect(described_class.where(id: molecule.id).count).to eq(0)
    end

    it 'modifies the inchikey' do
      id = molecule.id
      inchikey = molecule.inchikey
      molecule.save!
      molecule.destroy!
      deleted_molecule = described_class.only_deleted.find_by(id: id)
      expect(deleted_molecule&.inchikey).to start_with("#{id}_")
      expect(deleted_molecule&.inchikey).to end_with(inchikey)
    end
  end

  describe 'persistance' do
    let(:molecule) { build(:molecule) }

    it 'persists array of names' do
      molecule.names = %w[foo bar quz]
      molecule.save!
      persisted_molecule = described_class.last
      expect(persisted_molecule.names).to match_array(molecule.names)
    end

    it 'persists the binary molfile' do
      molfile_example = <<~MOL

          Ketcher 05301616272D 1   1.00000     0.00000     0

          2  1  0     0  0            999 V2000
            1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  END
      MOL
      molecule.assign_attributes(molfile: molfile_example)
      molecule.save!
      persisted_molecule = described_class.last
      persisted_molfile_sha =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_sha =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_sha).to eq(molfile_sha)
    end

    it 'updates LCSS when molecule.pubchem_lcss is requested' do
      molecule.save!
      persisted_molecule = described_class.last

      # lcss is updated as nil because cid 123456789 has no PubChem lcss
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).to be_nil

      # lcss is updated with value because cid 643785 has PubChem lcss
      persisted_molecule.tag.taggable_data['pubchem_cid'] = 643_785
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).not_to be_nil
    end
  end

  describe '#schedule_pubchem_lookup' do
    it 'schedules a single-element batch for a normally-created molecule' do
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = create(:molecule)

      expect(scheduled_ids).to eq([molecule.id])
    end
  end

  describe '#defer_pubchem_lookup' do
    it 'suppresses automatic scheduling when set true before create' do
      allow(PubchemLookupJob).to receive(:perform_later)

      build(:molecule, defer_pubchem_lookup: true).save!

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end
  end

  describe '.schedule_pubchem_lookup_for' do
    it 'schedules one job covering every given id' do
      first_molecule = create(:molecule, defer_pubchem_lookup: true)
      second_molecule = create(:molecule, defer_pubchem_lookup: true)
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_pubchem_lookup_for([first_molecule.id, second_molecule.id])

      expect(PubchemLookupJob).to have_received(:perform_later).once
      expect(scheduled_ids).to contain_exactly(first_molecule.id, second_molecule.id)
    end

    it 'only schedules ids that still exist' do
      survivor = create(:molecule, defer_pubchem_lookup: true)
      doomed = create(:molecule, defer_pubchem_lookup: true)
      doomed.destroy!
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_pubchem_lookup_for([survivor.id, doomed.id])

      expect(scheduled_ids).to eq([survivor.id])
    end

    it 'schedules nothing when no given id still exists' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_pubchem_lookup_for([])
      described_class.schedule_pubchem_lookup_for([-1])

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end
  end

  describe '.find_or_create_by_molfile' do
    let(:babel_info) do
      { inchikey: 'NEWMOLECULE-UHFFFAOYSA-N', is_partial: false, formula: 'H2O', molfile_version: 'V2000' }
    end

    before do
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
    end

    it 'defers scheduling when given defer_pubchem_lookup: true' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile', defer_pubchem_lookup: true, **babel_info)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    # Import::ImportSamples reaches this with an inchikey and nothing else when OpenBabel could
    # not read the molfile but smiles_to_inchikey still resolved a key. molecules.is_partial is
    # NOT NULL DEFAULT FALSE, so passing the missing key straight through assigns an explicit
    # nil over the default and raises ActiveRecord::NotNullViolation — which the RecordNotUnique
    # rescue does not catch, taking down the whole import.
    it 'creates the molecule when babel_info carries only an inchikey', :aggregate_failures do
      allow(PubchemLookupJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', inchikey: 'ONLYKEY-UHFFFAOYSA-N')

      expect(molecule).to be_persisted
      expect(molecule.is_partial).to be false
    end

    it 'schedules immediately when defer_pubchem_lookup is not given' do
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(scheduled_ids).to eq([molecule.id])
    end

    it 'does not schedule anything when the molecule already existed, regardless of defer_pubchem_lookup' do
      existing = create(
        :molecule,
        inchikey: babel_info[:inchikey],
        is_partial: false,
        sum_formular: babel_info[:formula],
        defer_pubchem_lookup: true,
      )
      allow(PubchemLookupJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', defer_pubchem_lookup: true, **babel_info)

      expect(molecule.id).to eq(existing.id)
      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'does not call PubChem synchronously on the create path (C2: enrichment is async)' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(Chemotion::PubchemService).not_to have_received(:molecule_info_from_inchikey)
    end

    # names is nullable but defaults to []. Deferred enrichment passes {}, and assigning nil
    # would send an explicit NULL that bypasses that default — readers index into it without
    # a nil guard (ChemicalAPI's molecule.names[0]).
    it 'stores names as an empty array, not NULL, when enrichment is deferred' do
      allow(PubchemLookupJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(molecule.reload.names).to eq([])
    end

    context 'when a concurrent worker wins the create race (C1)' do
      it 're-finds the existing row instead of raising PG::UniqueViolation, without re-enqueueing LCSS' do
        existing = create(
          :molecule,
          inchikey: babel_info[:inchikey],
          is_partial: false,
          sum_formular: babel_info[:formula],
          defer_pubchem_lookup: true,
        )
        # Simulate the TOCTOU race: find_by misses, then the INSERT collides with the row the
        # winning worker committed in the gap.
        allow(described_class).to receive(:find_by).and_return(nil, existing)
        allow(described_class).to receive(:create).and_raise(ActiveRecord::RecordNotUnique)
        allow(PubchemLookupJob).to receive(:perform_later)

        molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

        expect(molecule.id).to eq(existing.id)
        # the losing call must NOT re-enqueue enrichment/LCSS for a row the winner already handled
        # (its own failed Molecule.create never committed, so after_create_commit never fired)
        expect(PubchemLookupJob).not_to have_received(:perform_later)
      end

      # The stubbed sibling above raises RecordNotUnique in Ruby, which never touches Postgres
      # and so cannot detect a missing savepoint. This one drives a real unique-index
      # violation from inside an enclosing transaction — the shape every transactional caller
      # has (Sample's before_save :find_or_create_molecule, ImportSamples#write_to_db,
      # ImportCollections#import). Without requires_new: true the aborted INSERT leaves the
      # outer transaction in PG::InFailedSqlTransaction and the rescue's own re-find raises.
      it 'recovers from a genuine unique-index violation inside an enclosing transaction' do
        allow(PubchemLookupJob).to receive(:perform_later)
        winner = nil

        allow(described_class).to receive(:find_by).and_wrap_original do |orig, *args|
          found = orig.call(*args)
          next found unless found.nil? && winner.nil?

          # Stand in for the competing worker committing in the TOCTOU gap: the winning row
          # is created *before* the savepoint opens, so rolling back to it leaves the row.
          winner = create(
            :molecule,
            inchikey: babel_info[:inchikey],
            is_partial: false,
            sum_formular: babel_info[:formula],
            defer_pubchem_lookup: true,
          )
          nil
        end

        molecule = ActiveRecord::Base.transaction do
          described_class.find_or_create_by_molfile('molfile', defer_pubchem_lookup: true, **babel_info)
        end

        expect(winner).to be_present
        expect(molecule.id).to eq(winner.id)
        expect(described_class.where(inchikey: babel_info[:inchikey]).count).to eq 1
      end

      it 're-raises when the row is genuinely absent after RecordNotUnique' do
        allow(described_class).to receive(:find_by).and_return(nil, nil)
        allow(described_class).to receive(:create).and_raise(ActiveRecord::RecordNotUnique)

        expect do
          described_class.find_or_create_by_molfile('molfile', **babel_info)
        end.to raise_error(ActiveRecord::RecordNotUnique)
      end
    end
    # OpenBabel's SVG is discarded unconditionally by .svg_reprocess (its output always contains
    # 'Open Babel'), and rendering it is the only timeout-bounded operation in
    # molecule_info_from_molfile — on organometallic imports ~1 record in 10 spent the full 20 s
    # producing an SVG that was then thrown away.
    it 'does not ask OpenBabel for an SVG it is going to discard' do
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile')

      expect(Chemotion::OpenBabelService).to have_received(:molecule_info_from_molfile)
        .with('molfile', render_svg: false)
    end

    # The safety half of the above: the molecule must still end up with a picture, drawn by the
    # renderer chain rather than by OpenBabel.
    it 'still renders the SVG through the renderer chain' do
      allow(Chemotion::SvgRenderer).to receive(:render_svg_from_molfile).and_return(nil)
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(Chemotion::SvgRenderer).to have_received(:render_svg_from_molfile)
    end
  end

  describe '.schedule_pubchem_lookup_since' do
    it 'does nothing when timestamp is blank' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_pubchem_lookup_since(nil)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'does nothing when no molecule was created after the given timestamp' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_pubchem_lookup_since(1.hour.from_now)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'schedules a job covering molecules created after the given timestamp' do
      timestamp = 1.hour.ago
      create(:molecule)
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_pubchem_lookup_since(timestamp)

      expect(PubchemLookupJob).to have_received(:perform_later).with(nil, created_after: timestamp)
    end
  end

  describe '#assign_molecule_data svg_molfile: kwarg' do
    let(:molecule) { build(:molecule) }
    let(:babel_info) do
      {
        inchi: 'InChI=...', formula: 'C6H6', mol_wt: 78.0, mass: 78.0,
        cano_smiles: 'c1ccccc1', molfile_version: 'V2000', is_partial: false,
        svg: nil, ob_log: nil
      }
    end

    it 'uses svg_molfile for SVG generation when provided' do
      original_molfile = "full-molfile-with-PolymersList\n> <PolymersList>\n0/95/1.0-1.0\n$$$$"
      partial_molfile  = 'partial-molfile-no-PolymersList'
      molecule.molfile = partial_molfile

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, original_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, original_molfile)
    end

    it 'falls back to self.molfile when svg_molfile is not given' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {})
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'falls back to self.molfile when svg_molfile is nil explicitly' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, nil)
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'assigns molecular properties from babel_info regardless of svg_molfile' do
      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.molfile = 'molfile'

      molecule.assign_molecule_data(babel_info, {})

      expect(molecule.sum_formular).to eq('C6H6')
      expect(molecule.molecular_weight).to eq(78.0)
      expect(molecule.exact_molecular_weight).to eq(78.0)
    end
  end

  describe '.find_or_create_by_molfile with polymer (svg_molfile: fix)' do
    let(:polymer_molfile) do
      <<~MOL

          Ketcher  01012012572D 1   1.00000     0.00000     0

          2  1  0  0  0  0            999 V2000
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.2124    0.7000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  RGP  1   2   1
        M  END

        > <PolymersList>
        1/95/1.00-1.00

        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList) to assign_molecule_data as svg_molfile' do
      # Prevent actual OpenBabel / PubChem / SVG calls
      babel_info = {
        inchikey: 'TESTINCHIKEY12345-UHFFFAOYSA-N',
        inchi: 'InChI=1S/test',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(polymer_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, polymer_molfile)
    end
  end

  describe '.find_or_create_by_molfile with ball-only polymer (null header, TextNode)' do
    let(:ball_only_molfile) do
      <<~MOL
        null
          Ketcher  6232611422D 1   1.00000     0.00000     0

          1  0  0  0  0  0  0  0  0  0999 V2000
            2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END

        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList and TextNode) as svg_molfile' do
      babel_info = {
        inchikey: 'BALLONLYINCHIKEY-UHFFFAOYSA-N',
        inchi: 'InChI=1S/ball',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(ball_only_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, ball_only_molfile)
    end
  end

  describe '#assign_pubchem_names_and_cid!' do
    let(:molecule) { create(:molecule, iupac_name: nil, names: []) }

    it 'persists names/cid idempotently across repeated calls', :aggregate_failures do
      2.times do
        molecule.assign_pubchem_names_and_cid!(cid: '999', iupac_name: 'water', names: %w[aqua dihydrogen-oxide])
      end

      expect(molecule.reload.iupac_name).to eq('water')
      expect(molecule.tag.taggable_data['pubchem_cid']).to eq('999')
      # 'water' is the iupac_name and is not among names — PubChem does not guarantee it is.
      # A row is created for it regardless, so a sample has something to be re-pointed to.
      expect(molecule.molecule_names.where(description: 'iupac_name').pluck(:name))
        .to contain_exactly('aqua', 'dihydrogen-oxide', 'water')
    end

    it 'stores the names array so ChemicalAPI\'s common-name lookup has something to read' do
      molecule.assign_pubchem_names_and_cid!(cid: '962', iupac_name: 'water', names: %w[aqua oxidane])

      expect(molecule.reload.names).to eq(%w[aqua oxidane])
    end

    it 'does not clobber a names array an earlier call already stored' do
      molecule.assign_pubchem_names_and_cid!(cid: '962', iupac_name: 'water', names: %w[aqua])
      molecule.assign_pubchem_names_and_cid!(cid: '962', iupac_name: 'water', names: %w[something-else])

      expect(molecule.reload.names).to eq(%w[aqua])
    end

    it 'does not overwrite an existing cid/name with nil', :aggregate_failures do
      molecule.assign_pubchem_names_and_cid!(cid: '999', iupac_name: 'water', names: [])

      molecule.assign_pubchem_names_and_cid!(cid: nil, iupac_name: nil, names: [])

      expect(molecule.reload.tag.taggable_data['pubchem_cid']).to eq('999')
      expect(molecule.iupac_name).to eq('water')
    end

    it 'no-ops on blank info' do
      expect { molecule.assign_pubchem_names_and_cid!({}) }.not_to(change { molecule.molecule_names.count })
    end
  end
end
