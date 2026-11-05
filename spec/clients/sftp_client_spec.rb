# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SFTPClient', if: ENV['DOCKER'] do
  context 'with invalid session/data' do
    subject(:client) { SFTPClient.new(**settings) }

    let(:settings) do
      {
        host: '127.0.0.1',
        port: 1,
        user: 'none',
        password: 'none',
      }
    end

    describe 'upload, download, move and read a file' do
      it 'raises SFTPClientError' do
        expect { client.upload_file!('/invalid', '') }.to raise_error SFTPClientError
        expect { client.read_file('/invalid') }.to raise_error SFTPClientError
        expect { client.download_file!('', '') }.to raise_error SFTPClientError
        expect { client.write_to_file!('/invalid', '') }.to raise_error SFTPClientError
        expect { client.exist?('/invalid') }.to raise_error SFTPClientError
      end
    end
  end

  context 'with valid username/password' do
    # defaults to the sftp service of docker-compose.test.yml
    subject(:client) do
      SFTPClient.new(
        host: ENV.fetch('SFTP_TEST_HOST', 'sftp'),
        port: ENV.fetch('SFTP_TEST_PORT', '22').to_i,
        user: 'sftp_test',
        password: 'sftp_test',
      )
    end

    describe 'upload, download, move and read a file' do
      let(:download_path) { "#{Rails.root}/spec/fixtures/download.txt" }
      let(:upload_path)   { 'uploads/upload.txt' }
      let(:fixture_path)  { "#{Rails.root}/spec/fixtures/upload.txt" }
      let(:move_path)     { 'uploads/upload2.txt' }
      let(:write_path)    { 'uploads/upload3.txt' }

      before do
        client.upload_file!(fixture_path, upload_path)
        sleep 1
      end

      after do
        [upload_path, move_path, write_path].each do |path|
          client.remove_file!(path) if client.exist?(path)
        end
      end

      describe 'read_file' do
        it 'possible to read an uploaded file' do
          expect(client.read_file(upload_path)).to eq "Hello world\n"
        end
      end

      describe 'download_file!' do
        after { FileUtils.rm(download_path) if File.exist?(download_path) }

        it 'is possible to download an uploaded file' do
          client.download_file!(upload_path, download_path)
          expect(FileUtils.compare_file(download_path, fixture_path)).to eq true
        end
      end

      describe 'move_file!' do
        it 'is possible to move a file' do
          client.move_file!(upload_path, move_path)
          expect(client.read_file(move_path)).to eq "Hello world\n"
        end
      end

      describe 'write_to_file!' do
        it 'is possible to write a string to a file on the server' do
          client.write_to_file!(write_path, 'Testtest')
          expect(client.read_file(write_path)).to eq 'Testtest'
        end

        it 'is possible to write an utf-8 string to a file on the server' do
          client.write_to_file!(write_path, 'Tésttüst')
          expect(client.read_file(write_path)).to eq 'Tésttüst'
        end

        it 'overwrites existing file\'s content on the server' do
          client.write_to_file!(write_path, 'old content')
          client.write_to_file!(write_path, 'new content')
          expect(client.read_file(write_path)).to eq 'new content'
        end
      end

      describe 'exist?' do
        it 'returns true for an existing file' do
          expect(client.exist?(upload_path)).to eq true
        end

        it 'returns false for an non existing file' do
          expect(client.exist?('uploads/missing.txt')).to eq false
        end
      end
    end
  end
end
