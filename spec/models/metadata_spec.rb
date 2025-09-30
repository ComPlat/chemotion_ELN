# frozen_string_literal: true

# == Schema Information
#
# Table name: metadata
#
#  id            :bigint           not null, primary key
#  deleted_at    :datetime
#  metadata      :jsonb
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  collection_id :integer
#
require 'rails_helper'

RSpec.describe Metadata do
  describe 'creation' do
    let(:metadata) { create(:metadata) }

    it 'is possible to create a valid metadata instance' do
      expect(metadata.valid?).to be(true)
    end
  end

  describe 'to_radar_json' do
    let(:metadata) { create(:metadata) }

    it 'is possible to convert to a radar json' do
      radar_metadata = metadata.to_radar_json
      radar_metadata_json = JSON.parse(radar_metadata)
      expect(radar_metadata_json['descriptiveMetadata']['title']).to eq('A test collection')
    end
  end

  describe 'table of contents' do
    let(:metadata) { create(:metadata) }

    it 'is possible to create the table of contents from the collections samples' do
      expect(metadata.table_of_contents).to eq(Array.new(5, '[H2O] iupac_name]').join("\n"))
    end
  end

  describe 'set_radar_ids' do
    let(:metadata) { create(:metadata) }

    it 'is possible to set the radar ids' do # rubocop: disable RSpec/MultipleExpectations
      metadata.set_radar_ids('test_dataset_id', 'test_file_id')

      expect(metadata.metadata['datasetId']).to eq('test_dataset_id')
      expect(metadata.metadata['datasetUrl']).to eq('https://radar.example.com/radar/en/dataset/test_dataset_id')
      expect(metadata.metadata['fileId']).to eq('test_file_id')
      expect(metadata.metadata['fileUrl']).to eq('https://radar.example.com/radar/en/file/test_file_id')
    end
  end

  describe 'reset_radar_ids' do
    let(:metadata) { create(:metadata) }

    it 'is possible to reset the radar ids' do # rubocop: disable RSpec/MultipleExpectations
      metadata.metadata['datasetId'] = 'test'
      metadata.metadata['datasetUrl'] = 'test'
      metadata.metadata['fileId'] = 'test'
      metadata.metadata['fileUrl'] = 'test'

      metadata.reset_radar_ids

      expect(metadata.metadata['datasetId']).to be_nil
      expect(metadata.metadata['datasetUrl']).to be_nil
      expect(metadata.metadata['fileId']).to be_nil
      expect(metadata.metadata['fileUrl']).to be_nil
    end
  end
end
