# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Attachments::UploadChunkComplete do
  describe '.execute!' do
    let(:user) { create(:person) }
    let(:filename) { 'upload_chunks_completed.txt' }
    let(:key) { '453cc77f-e0e6-4757-b47b-656137eb7084' }
    let(:checksum) { 'adb11f193ccbcb0cfe7d28806bc43e8e' }
    let(:params) { { filename: filename, key: key, checksum: checksum } }
    let(:file_path) { Rails.root.join('tmp', 'uploads', 'full', params[:key], File.extname(filename)) }
    let(:chunk_file1) { Rails.root.join('tmp', 'uploads', 'chunks', "#{key}$0") }
    let(:chunk_file2) { Rails.root.join('tmp', 'uploads', 'chunks', "#{key}$1") }
    let(:simulate_upload_chunks) do
      source = Rails.root.join('spec', 'fixtures', 'upload.txt')
      FileUtils.mkdir_p(Rails.root.join('tmp', 'uploads', 'chunks'))

      FileUtils.cp(source, chunk_file1)
      FileUtils.cp(source, chunk_file2)
    end

    subject { described_class.execute!(user, params) }

    before { simulate_upload_chunks }

    after do
      FileUtils.rm_rf(Rails.root.join('tmp', 'uploads', 'full'))
      FileUtils.rm_f(chunk_file1)
      FileUtils.rm_f(chunk_file2)
    end

    context 'when checksum from params not matches the file checksum' do
      let(:checksum) { 'invalid' }

      it 'returns false' do
        expect(subject).to eq(false)
      end
      it 'removes the created merged file' do
        subject
        expect(File).not_to exist(file_path)
      end

      it 'removes the uploaded chunk files' do
        subject
        expect(File).not_to exist(chunk_file1)
        expect(File).not_to exist(chunk_file2)
      end
    end

    context 'when checksum from params matches the file checksum' do
      it 'returns true' do
        expect(subject).to eq(true)
      end

      it 'creates the attachment' do
        expect { subject }.to change(Attachment, :count).by(1)
      end

      it 'removes the created full file' do
        subject
        expect(File).not_to exist(file_path)
      end

      it 'removes the uploaded chunk files' do
        subject
        expect(File).not_to exist(chunk_file1)
        expect(File).not_to exist(chunk_file2)
      end
    end
  end
end
