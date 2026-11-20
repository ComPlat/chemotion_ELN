# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Containers::ComparisonCombineSpectra do
  let(:user) { create(:user) }
  let(:combined_image) do
    file = Tempfile.new(['combined', '.png'])
    file.write('png')
    file.rewind
    file
  end

  before do
    allow(Chemotion::Jcamp::CombineImg).to receive(:combine).and_return([nil, combined_image])
  end

  describe '.execute!' do
    context 'when the container cannot be resolved' do
      it 'raises ContainerNotFound' do
        params = { container_id: -1, spectra_ids: [-1], front_spectra_idx: 0 }

        expect do
          described_class.execute!(params, current_user: user)
        end.to raise_error(described_class::ContainerNotFound)
      end
    end

    context 'when updating an existing comparison dataset' do
      let(:analysis_container) do
        create(
          :analysis_container,
          extended_metadata: {
            'is_comparison' => 'true',
            'kind' => 'Type: 1H NMR',
            'analyses_compared' => [],
          },
        )
      end
      let!(:dataset_container) do
        create(:container, parent: analysis_container, container_type: 'dataset', name: 'Comparison dataset')
      end
      let!(:spectrum_attachment) do
        create(
          :attachment,
          :with_spectra_file,
          attachable: dataset_container,
          created_by: user.id,
          created_for: user.id,
        )
      end
      let(:params) do
        {
          container_id: analysis_container.id,
          spectra_ids: [spectrum_attachment.id],
          front_spectra_idx: 0,
        }
      end

      it 'returns success with dataset and analyses_compared' do
        result = described_class.execute!(params, current_user: user)

        expect(result[:status]).to be true
        expect(result[:dataset_id]).to eq(dataset_container.id)
        expect(result[:analyses_compared]).not_to be_empty
      end

      it 'sets is_comparison on the dataset' do
        described_class.execute!(params, current_user: user)

        expect(dataset_container.reload.extended_metadata['is_comparison']).to eq('true')
      end

      it 'stores combined_image.png as thumbnail' do
        described_class.execute!(params, current_user: user)

        combined = Attachment.find_by(filename: 'combined_image.png', attachable_id: dataset_container.id)
        expect(combined).to be_present
        expect(combined.thumb).to be true
      end
    end

    context 'when updating with edited_data_spectra' do
      let(:analysis_container) do
        create(
          :analysis_container,
          extended_metadata: {
            'is_comparison' => 'true',
            'kind' => 'Type: 1H NMR',
            'analyses_compared' => [],
          },
        )
      end
      let!(:dataset_container) do
        create(:container, parent: analysis_container, container_type: 'dataset', name: 'Comparison dataset')
      end
      let!(:spectrum_attachment) do
        create(
          :attachment,
          :with_spectra_file,
          attachable: dataset_container,
          created_by: user.id,
          created_for: user.id,
        )
      end
      let(:params) do
        {
          container_id: analysis_container.id,
          spectra_ids: [spectrum_attachment.id],
          front_spectra_idx: 0,
          edited_data_spectra: [{ si: { idx: spectrum_attachment.id }, peaksStr: '[]' }],
        }
      end

      before do
        new_jcamp = Tempfile.new(['regen', '.jdx'])
        allow(Chemotion::Jcamp::Create).to receive(:spectrum).and_return([new_jcamp, nil])
      end

      it 'regenerates the target spectrum before combining' do
        described_class.execute!(params, current_user: user)

        expect(Chemotion::Jcamp::Create).to have_received(:spectrum).once
      end
    end

    context 'when creating a comparison dataset under an analysis container' do
      let(:analysis_container) do
        create(
          :analysis_container,
          extended_metadata: {
            'is_comparison' => 'true',
            'kind' => 'Type: 1H NMR',
          },
        )
      end
      let(:source_dataset) { create(:container, container_type: 'dataset', name: 'Source dataset') }
      let!(:source_attachment) do
        create(
          :attachment,
          :with_spectra_file,
          attachable: source_dataset,
          created_by: user.id,
          created_for: user.id,
        )
      end
      let(:params) do
        {
          container_id: analysis_container.id,
          spectra_ids: [source_attachment.id],
          front_spectra_idx: 0,
        }
      end

      it 'creates a dataset child and copies the selected spectra' do
        expect do
          described_class.execute!(params, current_user: user)
        end.to change { analysis_container.children.where(container_type: 'dataset').count }.by(1)

        dataset = analysis_container.children.find_by(container_type: 'dataset')
        expect(dataset.attachments.where.not(filename: 'combined_image.png').count).to eq(1)
      end
    end

    context 'when extras contain deleted_attachment_ids' do
      let(:dataset_container) { create(:container, container_type: 'dataset') }
      let!(:attachment_to_delete) do
        create(
          :attachment,
          :with_spectra_file,
          attachable: dataset_container,
          created_by: user.id,
          created_for: user.id,
        )
      end
      let!(:spectrum_attachment) do
        create(
          :attachment,
          :with_spectra_file,
          attachable: dataset_container,
          created_by: user.id,
          created_for: user.id,
        )
      end
      let(:params) do
        {
          container_id: dataset_container.id,
          spectra_ids: [spectrum_attachment.id],
          front_spectra_idx: 0,
          extras: { deleted_attachment_ids: [attachment_to_delete.id] }.to_json,
        }
      end

      it 'destroys the listed attachments before combining' do
        described_class.execute!(params, current_user: user)

        expect(Attachment.exists?(attachment_to_delete.id)).to be false
      end
    end
  end
end
