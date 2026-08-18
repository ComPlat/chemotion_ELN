# frozen_string_literal: true

require 'mini_magick'

describe Usecases::Attachments::Thumbnail::ThumbnailGenerator do
  describe '.supported_formats' do
    it 'includes the common raster image formats and pdf' do
      expect(described_class.supported_formats).to include('jpg', 'png', 'tiff', 'pdf')
    end
  end

  describe '.create' do
    context 'with a valid image file' do
      let(:thumbnail) { described_class.create(Rails.root.join('spec/fixtures/upload.jpg').to_s) }

      after { FileUtils.rm_f(thumbnail) if thumbnail }

      it 'returns a path to an existing jpeg file' do
        expect(thumbnail).to be_present
        expect(File.exist?(thumbnail)).to be true
      end

      it 'produces a square thumbnail of the configured size' do
        expect(MiniMagick::Image.open(thumbnail).dimensions)
          .to eq([described_class::SIZE, described_class::SIZE])
      end
    end

    context 'with a valid pdf file' do
      let(:thumbnail) { described_class.create(Rails.root.join('spec/fixtures/upload.pdf').to_s) }

      after { FileUtils.rm_f(thumbnail) if thumbnail }

      it 'renders the first page to a jpeg thumbnail' do
        expect(thumbnail).to be_present
        expect(MiniMagick::Image.open(thumbnail).type).to eq('JPEG')
      end
    end

    context 'with an unsupported file type' do
      it 'returns nil' do
        expect(described_class.create(Rails.root.join('spec/fixtures/upload.txt').to_s)).to be_nil
      end
    end

    context 'with a non-existent file' do
      it 'returns nil' do
        expect(described_class.create('/no/such/file.jpg')).to be_nil
      end
    end

    context 'with a non-string argument' do
      it 'returns nil' do
        expect(described_class.create(nil)).to be_nil
      end
    end
  end
end
