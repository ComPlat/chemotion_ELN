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

    it 'schedules a single PubchemSingleLcssJob covering every new molecule in one chunk' do
      scheduled_ids = nil
      allow(PubchemSingleLcssJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      expect { batch_import.find_or_create_mol_by_batch }.to change(Molecule, :count).by(2)
      expect(PubchemSingleLcssJob).to have_received(:perform_later).once
      expect(scheduled_ids.size).to eq(2)
    end

    it 'schedules one PubchemSingleLcssJob per chunk when batch_size splits the import' do
      allow(PubchemSingleLcssJob).to receive(:perform_later)

      batch_import.find_or_create_mol_by_batch(1)

      expect(PubchemSingleLcssJob).to have_received(:perform_later).twice
    end

    # Regression for the reported bug: one molecule losing the create race must not abort the
    # whole import with PG::UniqueViolation (index_molecules_on_formula_and_inchikey_and_is_partial).
    it 'survives a concurrent-create RecordNotUnique on one molecule and still imports the rest (C1)' do
      allow(PubchemSingleLcssJob).to receive(:perform_later)

      raced_inchikey = "MOL#{Digest::SHA256.hexdigest(new_molfiles.first.to_s)[0..10]}-UHFFFAOYSA-N"
      winner = create(:molecule, inchikey: raced_inchikey, is_partial: false,
                                 sum_formular: nil, skip_lcss_callback: true)

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
          .with(polymer_molfile, lcss_batch: mapper.instance_variable_get(:@lcss_batch))
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
          .with(polymer_molfile, lcss_batch: mapper.instance_variable_get(:@lcss_batch))
        expect(tuple).to eq([resolved_molecule, polymer_molfile, {}])
      end
    end
  end
end
