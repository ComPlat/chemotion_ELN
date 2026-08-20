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
      expect(sample.xref['refractive_index']).to eq('1.0')
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

    it 'maps SDF property tags onto field names, keeps molfile, and drops unmatched tags / failed mols' do
      mapper.instance_variable_set(:@processed_mol, [
                                     { 'NAME' => 'Acetone', 'DESCRIPTION' => 'a ketone', 'UNKNOWN_TAG' => 'x',
                                       inchikey: 'CSCPPACGZOOCGX-UHFFFAOYSA-N', molfile: 'molfile-1',
                                       name: 'iupac', svg: 'molecules/x.svg' },
                                     { name: nil, inchikey: nil, svg: 'no_image_180.svg' }, # failed record
                                   ])

      rows = mapper.rows_from_processed_mol

      expect(rows).to eq([
                           { 'molfile' => 'molfile-1', 'name' => 'Acetone', 'description' => 'a ketone' },
                         ])
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

      it 'returns the no_image_180.svg placeholder when the resolver could not create a molecule' do
        allow(Import::PolymerMoleculeResolver).to receive(:call).and_return(
          Import::PolymerMoleculeResolver::Result.new(molecule: nil, raw_molfile: polymer_molfile, babel_info: nil),
        )

        row = mapper.find_or_create_polymer_molfile_entry(polymer_molfile, nil)

        expect(row).to eq({ name: nil, inchikey: nil, svg: 'no_image_180.svg' })
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
