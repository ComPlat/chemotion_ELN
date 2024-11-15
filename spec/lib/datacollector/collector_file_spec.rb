# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Datacollector::CollectorFile do
  let(:root_path) do
    build(
      :data_folder,
      root: Rails.configuration.datacollectors.dig(:localcollectors, 0, :path),
      name: '',
      mode: 0o755,
      mkdir: true,
    )
  end
  let(:relative_path) { 'test' }
  let(:full_path) do
    build(:data_file, root: root_path, name: relative_path, touch: true)
  end

  describe '#initialize' do
    context 'when the root path is invalid' do
      it 'raises an ArgumentError' do
        expect { described_class.new!(relative_path, '/invalid/root/path') }.to raise_error(ArgumentError)
      end
    end

    context 'when the relative path is invalid' do
      it 'raises an ArgumentError' do
        expect { described_class.new!('../invalid/path', root_path) }.to raise_error(ArgumentError)
      end
    end

    context 'when the paths are valid' do
      it 'initializes the object correctly' do
        full_path
        fstruct = described_class.new!(relative_path, root_path)
        expect(fstruct.root_path).to eq(root_path.to_s)
        expect(fstruct.relative_path).to eq(relative_path.to_s)
        expect(fstruct.path).to eq(full_path.to_s)
        full_path.delete
      end
    end
  end

  describe '#mtime' do
    context 'when the file exists locally' do
      it 'returns the modification time' do
        full_path
        fstruct = described_class.new(relative_path, root_path)
        expect(fstruct.mtime).to be_a(Time)
        full_path.delete
      end
    end

    context 'when the file exists on SFTP' do
      let(:sftp) { instance_double(Net::SFTP::Session) }
      let(:sftp_stat) { instance_double(Net::SFTP::Protocol::V01::Attributes, mtime: Time.now.to_i) }

      before do
        allow(sftp).to receive(:stat!).with(full_path).and_return(sftp_stat)
      end

      it 'returns the modification time' do
        fstruct = described_class.new(relative_path, root_path, sftp: sftp)
        expect(fstruct.mtime).to be_a(Time)
      end
    end
  end

  describe '#delete' do
    context 'when the file exists locally' do
      before do
        allow(File).to receive(:exist?).with(full_path).and_return(true)
        allow(FileUtils).to receive(:rm).with(full_path)
      end

      it 'deletes the file' do
        fstruct = described_class.new(relative_path, root_path)
        expect(fstruct.delete).to be true
      end
    end

    context 'when the file exists on SFTP' do
      let(:sftp) { instance_double(Net::SFTP::Session) }

      before do
        allow(sftp).to receive(:remove!).with(full_path)
      end

      it 'deletes the file' do
        fstruct = described_class.new(relative_path, root_path, sftp: sftp)
        expect(fstruct.delete).to be true
      end
    end
  end
end
