# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Datacollector::Configuration do
  describe '#key_path_for_device' do
    let(:key_dir) { Pathname.new(Dir.mktmpdir) }
    let(:key_name) { 'id_device' }
    let(:device) { build(:device, :file_sftp, datacollector_key_name: key_name) }
    let(:configuration) { described_class.new(device) }

    before do
      options = ActiveSupport::OrderedOptions.new
      options.keydir = key_dir.to_s
      allow(configuration).to receive(:config).and_return(options)
    end

    after { FileUtils.rm_rf(key_dir) }

    context 'when the key file exists in the key directory' do
      before { FileUtils.touch(key_dir.join(key_name)) }

      it 'returns the key path' do
        expect(configuration.key_path_for_device).to eq(key_dir.realpath.join(key_name).to_s)
      end

      it 'passes the key path to the SFTP client as a list' do
        expect(configuration.sftp_options_for_device)
          .to eq(keys: [key_dir.realpath.join(key_name).to_s], keys_only: true)
      end
    end

    context 'when the key directory is relative' do
      let(:relative_dir) { Pathname.new('tmp').join("keydir_spec_#{SecureRandom.hex(4)}") }

      before do
        FileUtils.mkdir_p(Rails.root.join(relative_dir))
        FileUtils.touch(Rails.root.join(relative_dir, key_name))
        configuration.config.keydir = relative_dir.to_s
      end

      after { FileUtils.rm_rf(Rails.root.join(relative_dir)) }

      it 'resolves it against the application root' do
        expect(configuration.key_path_for_device).to eq(Rails.root.join(relative_dir, key_name).realpath.to_s)
      end
    end

    context 'when the key directory cannot be searched' do
      before do
        skip 'root can read any file' if Process.uid.zero?
        FileUtils.touch(key_dir.join(key_name))
        File.chmod(0o600, key_dir)
      end

      after { File.chmod(0o700, key_dir) }

      it 'raises a datacollector error saying the key file cannot be read' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /not readable/)
      end
    end

    context 'when the key file does not exist' do
      it 'raises a datacollector error naming the key file' do
        expect { configuration.key_path_for_device }
          .to raise_error(Errors::DatacollectorError, /Key file .*#{Regexp.escape(key_name)} not found/)
      end
    end

    context 'when the key name points to the key directory itself' do
      let(:key_name) { '.' }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /Key file .* not found/)
      end
    end

    context 'when the key file is outside the key directory' do
      let(:other_dir) { Pathname.new("#{key_dir}_x").tap(&:mkpath) }
      let(:key_name) { other_dir.join('id_device').to_s }

      before { FileUtils.touch(key_name) }

      after { FileUtils.rm_rf(other_dir) }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /is outside/)
      end
    end

    context 'when the key file links to a file outside the key directory' do
      let(:other_dir) { Pathname.new(Dir.mktmpdir) }

      before do
        FileUtils.touch(other_dir.join('id_device'))
        File.symlink(other_dir.join('id_device'), key_dir.join(key_name))
      end

      after { FileUtils.rm_rf(other_dir) }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /is outside/)
      end
    end

    context 'when the key file cannot be read' do
      before do
        skip 'root can read any file' if Process.uid.zero?
        FileUtils.touch(key_dir.join(key_name))
        File.chmod(0o000, key_dir.join(key_name))
      end

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /not readable/)
      end
    end

    context 'when the key file name is not a valid path' do
      let(:key_name) { "id\0device" }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }
          .to raise_error(Errors::DatacollectorError, /Invalid key file name/)
      end
    end

    context 'when the key directory does not exist' do
      before { FileUtils.rm_rf(key_dir) }

      it 'raises a datacollector error naming the key directory' do
        expect { configuration.key_path_for_device }
          .to raise_error(Errors::DatacollectorError, /Key directory .* not found/)
      end
    end

    context 'when no key directory is configured' do
      before { allow(configuration).to receive(:config).and_return(ActiveSupport::OrderedOptions.new) }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }
          .to raise_error(Errors::DatacollectorError, /No datacollector key directory/)
      end
    end

    context 'when no key file name is set' do
      let(:key_name) { nil }

      it 'raises a datacollector error' do
        expect { configuration.key_path_for_device }.to raise_error(Errors::DatacollectorError, /No key file name/)
      end
    end
  end
end
