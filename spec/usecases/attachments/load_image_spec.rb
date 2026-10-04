# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::LoadImage do
  describe '.execute!' do
    let(:loaded_image) { described_class.execute!(attachment, annotated) }
    let(:annotated) { false }
    let(:tmp_file) do
      tmp_file = Tempfile.new
      tmp_file.binmode
      tmp_file.write(loaded_image)
      tmp_file
    end

    context 'with no image / PDF attachment' do
      let(:attachment) { create(:attachment) }
      let(:expected_error_message) { "no image / PDF attachment: #{attachment.id}" }

      it 'returns exception' do
        expect { loaded_image }.to raise_error(Usecases::Attachments::Errors::NotPreviewable, expected_error_message)
      end
    end

    context 'with a missing stored file' do
      let(:attachment) { create(:attachment, :with_image) }

      before { File.delete(attachment.attachment.url) }

      it 'raises FileMissing' do
        expect { loaded_image }.to raise_error(Usecases::Attachments::Errors::FileMissing)
      end
    end

    context 'with an image that ImageMagick cannot convert' do
      let(:attachment) { create(:attachment, :with_tif_file) }

      before do
        attachment.attachment_data['derivatives'].delete('conversion')
        allow_any_instance_of(Usecases::Attachments::Converter::FileConverter) # rubocop:disable RSpec/AnyInstance
          .to receive(:create_converted_file).and_raise(MiniMagick::Invalid)
      end

      it 'raises ConversionFailed' do
        expect { loaded_image }.to raise_error(Usecases::Attachments::Errors::ConversionFailed)
      end
    end

    context 'with a stored file (no open file handle is left behind)' do
      let(:attachment) { create(:attachment, :with_image) }

      it 'reads the file without keeping it open' do
        attachment # created (and its file stored) before File.open is watched
        allow(File).to receive(:open).and_call_original
        loaded_image
        expect(File).not_to have_received(:open)
      end
    end

    context 'with PDF attachment' do
      let(:attachment) { create(:attachment, :with_pdf) }

      it 'size of returned image equals original image' do
        expect(tmp_file.size).to eq attachment.filesize
      end
    end

    context 'with image attachment (jpg)' do
      let(:attachment) { create(:attachment, :with_image) }

      it 'size of returned image equals original image' do
        expect(tmp_file.size).to eq attachment.filesize
      end
    end

    context 'with image attachment (jpg) and annotated but not yet annotated' do
      let(:attachment) { create(:attachment, :with_image) }
      let(:annotated) { true }

      it 'size of returned image equals original image' do
        expect(tmp_file.size).to eq attachment.filesize
      end
    end

    context 'with image attachment(tif, already converted)' do
      let(:attachment) { create(:attachment, :with_tif_file) }

      it 'size of returned image equals size of converted image' do
        expect(tmp_file.size).to eq File.open(attachment.attachment(:conversion).url).size
      end
    end

    context 'with image attachment(tif, not yet converted [can happen due migration])' do
      let(:attachment) { create(:attachment, :with_tif_file) }
      let(:updated_attachment) { Attachment.find(attachment.id) }

      before do
        File.delete(attachment.attachment(:conversion).url)
        attachment.attachment_data['derivatives'].delete('conversion')
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'size of returned image equals size of converted image' do
        expect(tmp_file.size).to eq File.open(attachment.attachment(:conversion).url).size
      end
    end

    context 'with image attachment(tif, stored without any derivatives)' do
      let(:attachment) { create(:attachment, :with_tif_file) }
      let(:updated_attachment) { Attachment.find(attachment.id) }
      let(:loaded_image) { described_class.execute!(updated_attachment, annotated) }

      before do
        attachment.attachment_data.delete('derivatives')
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'converts the image and records the conversion' do
        expect(tmp_file.size).to be > 0
        expect(updated_attachment.attachment_data.dig('derivatives', 'conversion', 'id')).to be_present
      end
    end

    context 'with image attachment(gif, can not be annotated)' do
      let(:attachment) { create(:attachment, :with_gif_image) }

      it 'size of returned image equals original image' do
        expect(tmp_file.size).to eq attachment.filesize
      end
    end

    context 'with annotated image' do
      let(:annotation_updater) { Usecases::Attachments::Annotation::AnnotationUpdater.new }
      let(:attachment) { create(:attachment, :with_tif_file) }
      let(:annotated) { true }
      let(:updated_attachment) { Attachment.find(attachment.id) }
      let(:loaded_image) { described_class.execute!(updated_attachment, annotated) }

      before do
        annotation = Rails.root.join('spec/fixtures/annotations/20221207_valide_annotation_edited.svg').read
        annotation = annotation.gsub('/46', "/#{attachment.id}")
        annotation_updater.update_annotation(annotation, attachment.id)
      end

      it 'size of returned image equals size of converted image' do
        annotated_file_location = updated_attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] # rubocop:disable  Layout/LineLength
        expect(tmp_file.size).to eq File.open(updated_attachment.attachment.storage.directory + annotated_file_location).size # rubocop:disable  Layout/LineLength
      end
    end
  end
end
