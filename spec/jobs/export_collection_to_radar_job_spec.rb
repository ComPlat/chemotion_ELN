# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ExportCollectionToRadarJob do
  describe '#perform' do
    let(:user) { create(:person) }
    let(:collection) { create(:collection, user_id: user.id) }
    let(:job) { described_class.new }

    before do
      collection.metadata = create(:metadata)
    end

    # Regression: current_user_id used to be silently dropped on this path, so
    # Export::ExportCollections#exporting_user was always nil and an outside sample/reaction link
    # linked from a research plan in this collection could never be converted (see
    # #convert_sample_link_to_ketcher?/#convert_reaction_link_to_image?) — always dropped instead.
    it 'passes the acting user id through to Export::ExportCollections' do
      export_double = instance_double(
        Export::ExportCollections, prepare_data: nil, to_file: nil, file_path: 'path/to/export.zip'
      )
      allow(Oauth2::Radar).to receive(:store_file).and_return('radar-file-id')
      allow(Export::ExportCollections).to receive(:new).and_return(export_double)

      job.perform('access-token', collection.id, 'dataset-id', user.id)

      expect(Export::ExportCollections).to have_received(:new)
        .with(anything, [collection.id], 'zip', true, false, user.id)
    end

    it 'still succeeds when no user id is given (e.g. an already-enqueued job from before this argument existed)' do
      export_double = instance_double(
        Export::ExportCollections, prepare_data: nil, to_file: nil, file_path: 'path/to/export.zip'
      )
      allow(Oauth2::Radar).to receive(:store_file).and_return('radar-file-id')
      allow(Export::ExportCollections).to receive(:new).and_return(export_double)

      job.perform('access-token', collection.id, 'dataset-id')

      expect(Export::ExportCollections).to have_received(:new)
        .with(anything, [collection.id], 'zip', true, false, nil)
    end
  end
end
