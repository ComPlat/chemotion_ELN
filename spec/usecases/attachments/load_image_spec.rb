# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::LoadImage do
  describe '.execute!' do
    let(:loaded_image) { described_class.execute!(attachment, annotated) }
    let(:annotated) { false }
    let(:tmp_file) do
      tmp_file = Tempfile.new
      tmp_file.write(loaded_image)
      tmp_file
    end

    context 'with no image / PDF attachment' do
      let(:attachment) { create(:attachment) }
      let(:expected_error_message) { "no image / PDF attachment: #{attachment.id}" }

      it 'returns exception' do
        expect { loaded_image }.to raise_error(RuntimeError, expected_error_message)
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
