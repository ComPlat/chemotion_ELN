# frozen_string_literal: true

require 'rails_helper'

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
        'molfile' => Rails.root.join('spec/fixtures/mf_with_data_01.sdf').read,
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
end
