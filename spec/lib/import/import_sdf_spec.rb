# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe Import::ImportSdf do
  let(:mock_user) { create(:user) }
  let(:mock_collection) { create(:collection) }
  let(:molecule) { create(:molecule, inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N', is_partial: false) }
  let(:sdf_import) do
    described_class.new(
      collection_id: mock_collection.id,
      current_user_id: mock_user.id,
      mapped_keys: {
        short_label: 'EMP_FORMULA_SHORT',
        target_amount: 'AMOUNT',
        real_amount: 'REAL_AMOUNT',
        decoupled: 'MOLECULE-LESS',
        molarity: 'MOLARITY',
        melting_point: 'melting_point',
        boiling_point: 'boiling_point',
        location: 'location',
        external_label: 'external_label',
        name: 'name',
      },
      rows: [{
        'inchikey' => 'DTHMTBUWTGVEFG-DDWIOCJRSA-N',
        'molfile' => build(:molfile, type: 'mf_with_data_01'),
        'short_label' => 'C9H12ClNO2',
        'target_amount' => '10 g /  g',
        'real_amount' => '15mg/mg',
        'decoupled' => 'f',
        'molarity' => '700 M',
        'melting_point' => '50.0',
        'boiling_point' => '150.0-160.0',
        'location' => 'location',
        'external_label' => 'external_label',
        'name' => 'name',
        'flash_point' => { 'value' => '94.0', 'unit' => '°C' }.to_json,
        'refractive_index' => '1.0',
      }],
    )
  end

  before do
    allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(
      { inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N',
        is_partial: false,
        molfile_version: 'V2000' },
    )
    allow(Molecule).to receive(:find_by).with(
      inchikey: 'DTHMTBUWTGVEFG-DDWIOCJRSA-N', is_partial: false,
    ).and_return(molecule)
  end

  describe '#initialize' do
    it 'initializes with correct attributes' do
      expect(sdf_import.collection_id).to eq(mock_collection.id)
      expect(sdf_import.current_user_id).to eq(mock_user.id)
    end
  end

  describe '#create_samples' do
    it 'creates samples from valid raw_data' do
      expect { sdf_import.create_samples }.to change(Sample, :count).by(1)
      expect(sdf_import.message.scan('Import successful!').size).to eq(1)
    end

    # Covers the column assignment extracted out of the row loop into #build_sample_from_row and its
    # helpers: plain columns, xref columns, ranges, and the value-and-unit-in-one-cell amounts.
    it 'assigns the mapped columns onto the created sample' do
      sdf_import.create_samples
      sample = Sample.last

      expect(sample).to have_attributes(
        short_label: 'C9H12ClNO2',
        name: 'name',
        location: 'location',
        external_label: 'external_label',
        target_amount_value: 10.0,
        target_amount_unit: 'g',
        real_amount_value: 15.0,
        real_amount_unit: 'mg',
      )
      expect([sample.boiling_point.first.to_f, sample.boiling_point.last.to_f]).to eq([150.0, 160.0])
    end

    it 'assigns the ranged and xref columns onto the created sample' do
      sdf_import.create_samples
      sample = Sample.last

      expect(sample.melting_point.first.to_f).to eq(50.0)
      expect(sample.xref['refractive_index']).to eq(1.0)
    end

    # Both importers store the same value for the same cell: a percentage purity and a unit-less
    # density used to cost the value (or the row) when they arrived through an SDF.
    context 'with a percentage purity and a unit-less density' do
      before { sdf_import.rows.first.merge!('purity' => '95', 'density' => '0.85') }

      it 'reads the purity as a fraction, as the spreadsheet importer does' do
        sdf_import.create_samples

        expect(Sample.last.purity).to eq(0.95)
      end

      it 'keeps the density instead of dropping it for having no unit' do
        sdf_import.create_samples

        expect(Sample.last.density).to eq(0.85)
      end
    end

    # Regression: the per-row molecule resolve is native OpenBabel work that has been
    # measured at ~12s on an organometallic structure. The loop has to let go of its DB connection
    # before doing it -- a connection dropped or reaped during that window would otherwise poison
    # the rest of the import with PG::ConnectionBad. The release also has to stay *outside* the
    # write transaction, so the depth is asserted against whatever RSpec's transactional fixtures
    # already hold open around the example rather than against zero.
    #
    # Only releases made by the importer's own helper are counted, matched on the frame's method
    # name rather than its file (the helper lives on Import::ImportSamples, shared with the xlsx
    # path): has_closure_tree releases the connection once when Container is first autoloaded,
    # which happens mid-save here and is not ours.
    it 'releases the DB connection before resolving each row, never inside the write transaction' do
      baseline_depth = ActiveRecord::Base.connection.open_transactions
      order = []
      depths = []

      allow(ActiveRecord::Base.connection_pool).to receive(:release_connection).and_wrap_original do |orig, *args|
        origin = caller.find { |line| line.start_with?(Rails.root.to_s) }
        if origin&.include?('release_connection_for_native_work')
          order << :release
          depths << ActiveRecord::Base.connection.open_transactions
        end
        orig.call(*args)
      end
      allow(sdf_import).to receive(:resolve_molecule_for_row).and_wrap_original do |orig, *args|
        order << :resolve
        orig.call(*args)
      end

      expect { sdf_import.create_samples }.to change(Sample, :count).by(1)

      expect(order).to eq(%i[release resolve])
      expect(depths).to all(eq(baseline_depth))
    end

    context 'when an amount cell carries no readable value and unit' do
      before { sdf_import.rows.first['real_amount'] = 'quite a lot' }

      # The columns are named after the amount that actually failed: the real-amount branch used to
      # report 'target amount' when the cell had no unit at all, pointing at the wrong column.
      it 'falls back to 0 g and names the real amount columns in the message' do
        sdf_import.create_samples
        sample = Sample.last

        expect(sample).to have_attributes(real_amount_value: 0.0, real_amount_unit: 'g')
        expect(sdf_import.error_messages.join).to include('real amount, real amount unit')
      end
    end
  end

  describe '#rows_from_processed_mol' do
    let(:mapper) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id)
    end

    before do
      mapper.instance_variable_set(:@processed_mol, [
                                     { 'NAME' => 'Acetone', 'DESCRIPTION' => 'a ketone', 'UNKNOWN_TAG' => 'x',
                                       inchikey: 'CSCPPACGZOOCGX-UHFFFAOYSA-N', molfile: 'molfile-1',
                                       name: 'iupac', svg: 'molecules/x.svg' },
                                     # A record whose structure could not be resolved at all.
                                     { 'NAME' => 'Mystery', name: nil, inchikey: nil, svg: 'no_image_180.svg',
                                       decoupled: true, decoupled_reason: 'no structure could be resolved' },
                                   ])
    end

    it 'maps SDF property tags onto field names, keeps molfile, and drops unmatched tags' do
      expect(mapper.rows_from_processed_mol.first)
        .to eq({ 'molfile' => 'molfile-1', 'name' => 'Acetone', 'description' => 'a ketone' })
    end

    # Imported without a structure rather than dropped, as the spreadsheet importer does.
    it 'keeps a record whose structure could not be resolved, as a row with no molfile' do
      expect(mapper.rows_from_processed_mol.last).to eq({ 'molfile' => nil, 'name' => 'Mystery' })
    end

    it 'records it as decoupled, with the reason and the record number' do
      mapper.rows_from_processed_mol
      expect(mapper.decoupled_records)
        .to eq([{ record: 2, reason: 'no structure could be resolved' }])
    end
  end

  # The spreadsheet importer's fallbacks, in its order: structure, SMILES, CAS, then decoupled.
  describe 'resolving a record whose molfile gives no structure' do
    let(:importer) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id)
    end
    let(:smiles_molecule) { create(:molecule, inchikey: 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N') }
    let(:cas_molecule) { create(:molecule, inchikey: 'QTBSBXVTEAMEQO-UHFFFAOYSA-N') }

    def record(tags)
      tags.map { |tag, value| "> <#{tag}>\n#{value}\n\n" }.join
    end

    it 'resolves the structure from a SMILES tag when the molfile could not give one' do
      allow(Molecule).to receive(:find_or_create_by_cano_smiles).and_return(smiles_molecule)

      entry = importer.send(:molfile_entry_without_inchikey, record('SMILES' => 'CCO'))

      expect(entry[:inchikey]).to eq(smiles_molecule.inchikey)
    end

    it 'prefers the SMILES tag over the CAS number, which costs a network lookup' do
      allow(Molecule).to receive(:find_or_create_by_cano_smiles).and_return(smiles_molecule)
      allow(importer).to receive(:find_molecule_by_cas)

      importer.send(:molfile_entry_without_inchikey, record('SMILES' => 'CCO', 'CAS' => '64-17-5'))

      expect(importer).not_to have_received(:find_molecule_by_cas)
    end

    it 'falls back to the CAS number when there is no SMILES tag' do
      allow(importer).to receive(:find_molecule_by_cas).with('64-17-5').and_return(cas_molecule)

      entry = importer.send(:molfile_entry_without_inchikey, record('CAS' => '64-17-5'))

      expect(entry[:inchikey]).to eq(cas_molecule.inchikey)
    end

    it 'falls back to the CAS number when the SMILES tag itself cannot be read' do
      allow(Molecule).to receive(:find_or_create_by_cano_smiles).and_raise(StandardError, 'not a smiles')
      allow(importer).to receive(:find_molecule_by_cas).with('64-17-5').and_return(cas_molecule)

      entry = importer.send(:molfile_entry_without_inchikey, record('SMILES' => '!!', 'CAS' => '64-17-5'))

      expect(entry[:inchikey]).to eq(cas_molecule.inchikey)
    end

    it 'marks the record decoupled when nothing resolves' do
      entry = importer.send(:molfile_entry_without_inchikey, record('NAME' => 'Mystery'))

      expect(entry).to include(inchikey: nil, decoupled: true)
    end

    # A molfile block is always present, so only its atom count says whether anything was offered.
    it 'says the record carried nothing to resolve from when its CTAB is empty' do
      entry = importer.send(:molfile_entry_without_inchikey, record('NAME' => 'Mystery'))

      expect(entry[:decoupled_reason]).to eq('the record carries no structure and no CAS number')
    end

    it 'names the molfile when its CTAB had atoms that could not be read' do
      ctab = "\n  x\n\n  3  2  0  0  0  0  0  0  0  0999 V2000\nM  END\n"
      entry = importer.send(:molfile_entry_without_inchikey, ctab + record('NAME' => 'Mystery'))

      expect(entry[:decoupled_reason]).to eq('no structure could be resolved from the molfile')
    end

    # A different fix from having nothing to resolve from.
    it 'names the CAS number that resolved to nothing' do
      allow(importer).to receive(:find_molecule_by_cas).and_return(nil)

      entry = importer.send(:molfile_entry_without_inchikey, record('CAS' => '99999-99-9'))

      expect(entry[:decoupled_reason]).to include('CAS 99999-99-9')
    end
  end

  describe '#import_from_file' do
    let(:one_shot) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id)
    end

    it 'runs the molecule pass, builds rows from processed mols, then creates samples' do
      allow(one_shot).to receive(:find_or_create_mol_by_batch)
      allow(one_shot).to receive(:create_samples)
      allow(one_shot).to receive(:rows_from_processed_mol).and_return([{ 'molfile' => 'm' }])

      one_shot.import_from_file

      expect(one_shot).to have_received(:find_or_create_mol_by_batch).ordered
      expect(one_shot).to have_received(:create_samples).ordered
      expect(one_shot.rows).to eq([{ 'molfile' => 'm' }])
    end
  end

  # End to end over the path the job uses: the record still becomes a sample, and the import says why.
  describe 'importing a file whose record resolves no structure at all' do
    let(:unresolvable) { "\n\n\n  0  0\nM  END\n> <NAME>\nMystery\n\n" }
    let(:importer) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id,
                          raw_data: [unresolvable])
    end

    before do
      allow(Molecule).to receive(:find_by).and_call_original
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfiles).and_return([nil])
    end

    it 'creates the sample instead of dropping the record' do
      expect { importer.import_from_file }.to change(Sample, :count).by(1)
    end

    it 'imports it decoupled' do
      importer.import_from_file
      expect(Sample.last.decoupled).to be(true)
    end

    it 'keeps the tags the record did carry' do
      importer.import_from_file
      expect(Sample.last.name).to eq('Mystery')
    end

    it 'does not report the record as unprocessable, because it was imported' do
      importer.import_from_file
      expect(importer.unprocessable_samples).to be_empty
    end

    it 'says in the message that the record was imported without a structure, and why' do
      importer.import_from_file
      expect(importer.message)
        .to include('imported without a structure', 'carries no structure and no CAS number', 'record 1')
    end

    # Counting inchikeys made a wholly decoupled file report an error status.
    it 'does not claim that no molecule was processed' do
      importer.import_from_file
      expect(importer.status).to eq('ok')
    end
  end

  # Not a fallback but a declaration, so nothing to report. Cf. ImportSamples#process_row_data.
  describe 'importing a record that says it is decoupled' do
    let(:tagged) { "\n\n\n  0  0\nM  END\n> <DECOUPLED>\nyes\n\n> <NAME>\nIntentional\n\n" }
    let(:importer) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id,
                          raw_data: [tagged])
    end

    before do
      allow(Molecule).to receive(:find_by).and_call_original
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfiles).and_return([nil])
    end

    it 'imports it' do
      expect { importer.import_from_file }.to change(Sample, :count).by(1)
    end

    it 'honours the tag, which used to be mapped to nothing' do
      importer.import_from_file
      expect(Sample.last.decoupled).to be(true)
    end

    it 'does not report it as having lost a structure' do
      importer.import_from_file
      expect(importer.decoupled_records).to be_empty
    end

    it 'reports a clean import rather than a warning' do
      importer.import_from_file
      expect(importer.message).not_to include('imported without a structure')
    end

    # Something was offered and could not be used, which stays the user's to fix.
    context 'when it also carries a CAS number that resolves to nothing' do
      let(:tagged) do
        "\n\n\n  0  0\nM  END\n> <DECOUPLED>\nyes\n\n> <CAS>\n99999-99-9\n\n"
      end

      before { allow(importer).to receive(:find_molecule_by_cas).and_return(nil) }

      it 'is still reported' do
        importer.import_from_file
        expect(importer.decoupled_records.first[:reason]).to include('CAS 99999-99-9')
      end
    end
  end

  describe '#find_or_create_mol_by_batch' do
    let(:new_molfiles) { [build(:molfile, type: 'mf_with_data_01'), build(:molfile, type: :water)] }
    let(:batch_import) do
      described_class.new(
        collection_id: mock_collection.id,
        current_user_id: mock_user.id,
        raw_data: new_molfiles,
      )
    end

    before do
      # override the file-level narrow Molecule.find_by stub (scoped to a
      # different, pre-existing inchikey) so these genuinely-new molecules
      # resolve via a real (nil-returning) lookup and actually get created.
      allow(Molecule).to receive(:find_by).and_call_original
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      # Keyed off molfile content (not a call-local index) so a fresh
      # inchikey is produced consistently whether all molfiles are resolved
      # in one find_or_create_by_molfiles call or split across chunks.
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfiles) do |molfiles|
        molfiles.map do |molfile|
          digest = Digest::SHA256.hexdigest(molfile.to_s)[0..10]
          { inchikey: "MOL#{digest}-UHFFFAOYSA-N", is_partial: false, molfile_version: 'V2000', molfile: molfile }
        end
      end
    end

    # The bound only exists if the importer asks for it: molecule_info_from_* defaults
    # bound_native_work to false so the request path -- above all Sample's before_save -- does not
    # fork per call. Drop the flag here and the canonical writer silently goes back to being
    # unbounded on exactly the metal-heavy files it was measured on, with nothing failing.
    it 'asks for the canonical-SMILES bound, which the request path does not get by default' do
      allow(PubchemLookupJob).to receive(:perform_later)
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfiles).and_return([])

      batch_import.find_or_create_mol_by_batch

      expect(Chemotion::OpenBabelService).to have_received(:molecule_info_from_molfiles)
        .with(anything, render_svg: false, bound_native_work: true)
    end

    # Regression, phase 1 -- the half the first pass at this fix missed. One
    # molecule_info_from_molfiles call covers a whole batch (50 records by default), each of
    # which can burn up to Chemotion::OpenBabelService::CANONICAL_SMILES_TIMEOUT_SECONDS in
    # native code with no SQL in between, so this is the *longest* window in the import in which
    # a connection can be dropped or reaped.
    #
    # Verified against a real killed backend: with the release removed, terminating the backend
    # during this call loses the entire import (0/40 records, PG::ConnectionBad "PQsocket() can't
    # get socket descriptor" -- the exact production symptom), because the per-record rescue in
    # #find_or_create_by_molfiles cannot help a connection that is never re-verified.
    it 'releases the DB connection before the batch OpenBabel call' do
      allow(PubchemLookupJob).to receive(:perform_later)
      order = []

      allow(ActiveRecord::Base.connection_pool).to receive(:release_connection).and_wrap_original do |orig, *args|
        origin = caller.find { |line| line.start_with?(Rails.root.to_s) }
        order << :release if origin&.include?('release_connection_for_native_work')
        orig.call(*args)
      end
      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfiles).and_wrap_original do |orig, *args|
        order << :openbabel
        orig.call(*args)
      end

      batch_import.find_or_create_mol_by_batch

      expect(order.first(2)).to eq(%i[release openbabel])
    end

    it 'schedules PubchemLookupJob covering every new molecule, via a created_after timestamp' do
      started_at = Time.current
      allow(PubchemLookupJob).to receive(:perform_later)

      expect { batch_import.find_or_create_mol_by_batch }.to change(Molecule, :count).by(2)
      # created_after with no id list: a lower bound with no upper one, so a single job's
      # ascending-id cursor keeps covering molecules created by later batches.
      expect(PubchemLookupJob).to have_received(:perform_later)
        .with(nil, created_after: be >= started_at).at_least(:once)
    end

    # Enrichment must start while the import is still running, not only after every batch is
    # done — on a real 529-record file the ensure-only version left every molecule nameless for
    # ~80 minutes.
    it 'schedules enrichment after the first batch, before the import has finished' do
      scheduled_calls = 0
      scheduled_before_last_batch = nil
      batches_seen = 0
      allow(PubchemLookupJob).to receive(:perform_later) { scheduled_calls += 1 }
      allow(batch_import).to receive(:find_or_create_by_molfiles).and_wrap_original do |orig, *args|
        batches_seen += 1
        # Sampled at the start of the *last* batch: enrichment must already be queued by then.
        scheduled_before_last_batch = scheduled_calls if batches_seen == 2
        orig.call(*args)
      end

      batch_import.find_or_create_mol_by_batch(1)

      expect(batches_seen).to eq(2)
      expect(scheduled_before_last_batch).to eq(1)
    end

    # Regression guard for the per-chunk fan-out defect fixed earlier in this work: enqueueing
    # once per batch would put 1000 jobs in the queue for a 50k-molecule import. The count must
    # be bounded (first-batch kick + the ensure flush), not proportional to batch count.
    it 'schedules a bounded number of jobs however many chunks the import splits into' do
      allow(PubchemLookupJob).to receive(:perform_later)

      batch_import.find_or_create_mol_by_batch(1) # 2 molfiles, batch_size 1 => 2 batches

      expect(PubchemLookupJob).to have_received(:perform_later).twice
    end

    # Regression for the reported bug: one molecule losing the create race must not abort the
    # whole import with PG::UniqueViolation (index_molecules_on_formula_and_inchikey_and_is_partial).
    it 'survives a concurrent-create RecordNotUnique on one molecule and still imports the rest (C1)' do
      allow(PubchemLookupJob).to receive(:perform_later)

      raced_inchikey = "MOL#{Digest::SHA256.hexdigest(new_molfiles.first.to_s)[0..10]}-UHFFFAOYSA-N"
      winner = create(:molecule, inchikey: raced_inchikey, is_partial: false,
                                 sum_formular: nil, defer_pubchem_lookup: true)

      # The raced molecule's decision-lookup misses first (winner committed in the gap),
      # then the rescue re-find returns the winner; all other lookups behave normally.
      first_lookup = true
      allow(Molecule).to receive(:find_by).and_wrap_original do |orig, *args|
        cond = args.first
        if cond.is_a?(Hash) && cond[:inchikey] == raced_inchikey
          next winner unless first_lookup

          first_lookup = false
          nil
        else
          orig.call(*args)
        end
      end

      # The raced molecule's INSERT collides once; every other create proceeds normally.
      allow(Molecule).to receive(:create).and_wrap_original do |orig, *args, &blk|
        cond = args.first
        raise ActiveRecord::RecordNotUnique if cond.is_a?(Hash) && cond[:inchikey] == raced_inchikey

        orig.call(*args, &blk)
      end

      # Only the genuinely-new water molecule is inserted; the raced one reuses the winner
      # (no duplicate, no aborted import). If the bug regressed, this block would raise.
      expect { batch_import.find_or_create_mol_by_batch }.to change(Molecule, :count).by(1)
      expect(batch_import.inchi_array).to include(raced_inchikey)
    end

    # Regression: molecule_info_from_molfiles already guards the OpenBabel work per
    # record, but the Molecule find-or-create that follows it had no guard of its own -- a
    # dropped/reaped DB connection there (or any other StandardError) used to escape
    # find_or_create_by_molfiles, process_molecule_batches and find_or_create_mol_by_batch
    # entirely, aborting the whole import instead of just the one record.
    it 'survives a DB-level failure resolving one molecule and still imports the rest' do
      allow(PubchemLookupJob).to receive(:perform_later)

      failing_inchikey = "MOL#{Digest::SHA256.hexdigest(new_molfiles.first.to_s)[0..10]}-UHFFFAOYSA-N"
      allow(Molecule).to receive(:find_or_create_by_molfile).and_wrap_original do |orig, *args, **kwargs|
        raise ActiveRecord::StatementInvalid, 'PG::ConnectionBad' if kwargs[:inchikey] == failing_inchikey

        orig.call(*args, **kwargs)
      end

      # Only the water molecule is created; the failing record is skipped rather than aborting
      # the whole batch.
      expect { batch_import.find_or_create_mol_by_batch }.to change(Molecule, :count).by(1)
      expect(batch_import.inchi_array).not_to include(failing_inchikey)
    end
  end

  describe 'polymer molfile delegation to Import::PolymerMoleculeResolver' do
    let(:mapper) do
      described_class.new(collection_id: mock_collection.id, current_user_id: mock_user.id)
    end
    let(:polymer_molfile) { "some ctab\n> <PolymersList>\ndata" }
    let(:resolved_molecule) { create(:molecule, iupac_name: 'polymer-name', molecule_svg_file: 'x.svg') }
    let(:resolver_result) do
      Import::PolymerMoleculeResolver::Result.new(
        molecule: resolved_molecule, raw_molfile: polymer_molfile, babel_info: {},
      )
    end

    describe '#find_or_create_polymer_molfile_entry' do
      it 'delegates to Import::PolymerMoleculeResolver and builds a row-hash from the Result' do
        allow(Import::PolymerMoleculeResolver).to receive(:call).and_return(resolver_result)

        row = mapper.find_or_create_polymer_molfile_entry(polymer_molfile, nil)

        expect(Import::PolymerMoleculeResolver).to have_received(:call)
          .with(polymer_molfile, defer_pubchem_lookup: mapper.instance_variable_get(:@defer_pubchem_lookup))
        expect(row).to include(
          inchikey: resolved_molecule.inchikey,
          svg: 'molecules/x.svg',
          name: 'polymer-name',
          molfile: polymer_molfile,
        )
      end

      # A polymer record has as much to fall back on as any other.
      it 'falls back to the SMILES/CAS/decoupled chain when the resolver could not create a molecule' do
        allow(Import::PolymerMoleculeResolver).to receive(:call).and_return(
          Import::PolymerMoleculeResolver::Result.new(molecule: nil, raw_molfile: polymer_molfile, babel_info: nil),
        )

        row = mapper.find_or_create_polymer_molfile_entry(polymer_molfile, nil)

        expect(row).to include(name: nil, inchikey: nil, svg: 'no_image_180.svg', decoupled: true)
      end
    end

    describe '#molecule_and_molfile_for_row' do
      it 'delegates to Import::PolymerMoleculeResolver and returns a [molecule, raw_molfile, babel_info] tuple' do
        allow(Import::PolymerMoleculeResolver).to receive(:call).and_return(resolver_result)

        tuple = mapper.molecule_and_molfile_for_row(polymer_molfile)

        expect(Import::PolymerMoleculeResolver).to have_received(:call)
          .with(polymer_molfile, defer_pubchem_lookup: mapper.instance_variable_get(:@defer_pubchem_lookup))
        expect(tuple).to eq([resolved_molecule, polymer_molfile, {}])
      end
    end
  end
end
