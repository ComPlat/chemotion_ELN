require 'rails_helper'

RSpec.describe 'SFTPClient', if: ENV['DOCKER'] do
  context 'with invalid session/data' do
    let(:settings) {
      {
        host: '127.0.0.1',
        port: '1',
        username: 'none',
        password: 'none'
      }
    }

    subject { SFTPClient.new(settings) }

    describe 'upload, download, move and read a file' do
      it 'raises SFTPClientError' do
        expect { subject.upload_file!('/invalid', '') }.to raise_error SFTPClientError
        expect { subject.read_file('/invalid') }.to raise_error SFTPClientError
        expect { subject.download_file!('', '') }.to raise_error SFTPClientError
        expect { subject.write_to_file!('/invalid', '') }.to raise_error SFTPClientError
        expect { subject.file_exists?('/invalid') }.to raise_error SFTPClientError
      end
    end
  end

  context 'with valid username/password' do
    subject { SFTPClient.with_default_settings }

    describe 'upload, download, move and read a file' do
      let(:download_path) { "#{Rails.root}/spec/fixtures/download.txt" }
      let(:upload_path)   { "uploads/upload.txt" }
      let(:fixture_path)  { "#{Rails.root}/spec/fixtures/upload.txt" }
      let(:move_path)     { "uploads/upload2.txt" }
      let(:write_path)    { "uploads/upload3.txt" }

      before { subject.upload_file!(fixture_path, upload_path); sleep 1 }
      after do
        subject.remove_file!(upload_path)
        subject.remove_file!(move_path)
        subject.remove_file!(write_path)
      end

      describe 'read_file' do
        it 'possible to read an uploaded file' do
          expect(subject.read_file(upload_path)).to eq "Hello world\n"
        end
      end

      describe 'download_file!' do
        after { FileUtils.rm(download_path) if File.exist?(download_path) }

        it 'is possible to download an uploaded file' do
          subject.download_file!(upload_path, download_path)
          expect(FileUtils.compare_file(download_path, fixture_path)).to eq true
        end
      end

      describe 'move_file!' do
        it 'is possible to move a file' do
          subject.move_file!(upload_path, move_path)
          expect(subject.read_file(move_path)).to eq "Hello world\n"
        end
      end

      describe 'write_to_file!' do
        it 'is possible to write a string to a file on the server' do
          subject.write_to_file!(write_path, "Testtest")
          expect(subject.read_file(write_path)).to eq "Testtest"
        end

        it 'is possible to write an utf-8 string to a file on the server' do
          subject.write_to_file!(write_path, "Tésttüst")
          expect(subject.read_file(write_path)).to eq "Tésttüst"
        end

        it 'overwrites existing file\'s content on the server' do
          subject.write_to_file!(write_path, "old content")
          subject.write_to_file!(write_path, "new content")
          expect(subject.read_file(write_path)).to eq "new content"
        end
      end

      describe 'file_exists?' do
        it 'returns true for an existing file' do
          expect(subject.file_exists?(upload_path)).to eq true
        end

        it 'returns false for an non existing file' do
          expect(subject.file_exists?("/invalid/path")).to eq false
        end
      end
    end
  end
end
