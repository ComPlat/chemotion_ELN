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
  end
end
