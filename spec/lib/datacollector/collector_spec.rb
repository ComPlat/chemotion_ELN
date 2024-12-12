# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Datacollector::Collector, type: :model do
  let(:users) { create_list(:person, 2) }
  let(:users_unknown) { build_list(:person, 1) }
  let(:name_abbrs) { (users + users_unknown).map(&:name_abbreviation) }
  let(:emails) { (users + users_unknown).map(&:email) }
  let(:data_count) { 1 }
  let(:file_count) { 1 }

  describe '.execute' do
    # @todo context sftp-keyfile-authentication and sftp-password-authentication
    # @todo context undeletable files and bypassing them / registering collector errors
    # @todo context files not ready (creation time < sleep time)

    shared_examples 'a working collector without user directories' do
      it 'executes and writes the correct number of files in database' do
        collector = described_class.new(device)
        raise 'example not ready ' unless collector_data.to_s == collector.collector_dir

        expect(Dir).not_to be_empty(collector.collector_dir)
        expect { collector.execute }.to change(Attachment, :count).by(data_count * users.count)
        expect(Dir).to be_empty(collector.collector_dir)
      end
    end

    shared_examples 'a working collector with user directories' do
      it 'executes and writes the correct number of files in database' do
        collector = described_class.new(device)
        path = collector_data.join(users.first.name_abbreviation)
        path_unknown = collector_data.join(users_unknown.first.name_abbreviation)

        expect(Dir.empty?(path) || Dir.empty?(path_unknown)).to be_falsey
        expect { collector.execute }.to change(Attachment, :count).by(data_count * users.count)
        # real user dir to be empty, unknown user dir to be untouched
        expect(!Dir.empty?(path) || Dir.empty?(path_unknown)).to be_falsey
      end
    end

    user_level_options = [true, false]
    collector_options = {
      file_local: 'local file',
      folder_local: 'local folder',
      file_sftp: 'sftp file',
      folder_sftp: 'sftp folder',
    }
    collector_options.each do |device_trait, description|
      user_level_options.each do |user_level|
        context "with a device configured for #{description} #{user_level ? '(user dirs)' : ''}" do
          let(:device) do
            create(
              :device,
              device_trait,
              datacollector_user_level_selected: user_level,
              datacollector_number_of_files: file_count,
            )
          end
          let(:collector_data) do
            build(
              :data_for_collector,
              device: device,
              user_identifiers: name_abbrs,
              data_count: data_count,
              file_count: file_count,
            )
          end

          example = "a working collector with#{user_level ? '' : 'out'} user directories"
          it_behaves_like example
        end
      end
    end

    context 'when folder is not ready for collection' do
      # let(:file_count) { 2 }
      let(:device) do
        create(
          :device,
          :folder_local,
          datacollector_number_of_files: file_count + 1,
        )
      end

      it 'does not process the folder when not enough file are there' do
        device_dir = build(
          :data_for_collector, device: device, user_identifiers: name_abbrs[0..0], file_count: file_count
        )
        collector = described_class.new(device)
        expected_files = device.datacollector_number_of_files.to_i - 1
        # Ensure test files are set up and test execution
        # rubocop:disable Performance/Count
        expect(device_dir.glob('**/*').select(&:file?).count).to eq(expected_files)
        expect { collector.execute }.not_to change(Attachment, :count)
        expect(device_dir.glob('**/*').select(&:file?).count).to eq(expected_files)
        # rubocop:enable Performance/Count
      end

      it 'does not process the folder when the file has just been created' do
        expected_files = device.datacollector_number_of_files.to_i
        device_dir = build(
          :data_for_collector, device: device, user_identifiers: name_abbrs[0..0], file_count: expected_files
        )
        collector = described_class.new(device)
        allow(collector.config).to receive(:sleep_time).and_return(10)
        # Ensure test files are set up and test execution
        # rubocop:disable Performance/Count
        expect(device_dir.glob('**/*').select(&:file?).count).to eq(expected_files)
        expect { collector.execute }.not_to change(Attachment, :count)
        expect(device_dir.glob('**/*').select(&:file?).count).to eq(expected_files)
        # rubocop:enable Performance/Count
      end

      it 'does not process the folder when no files are there' do
        device_dir = build(:data_for_collector, device: device, user_identifiers: name_abbrs[0..0], file_count: 0)
        collector = described_class.new(device)
        # Ensure test files are set up and test execution
        # rubocop:disable Performance/Count
        expect(device_dir.glob('**/*').select(&:file?).count).to eq(0)
        expect { collector.execute }.not_to change(Attachment, :count)
        expect(device_dir.glob('**/*').select(&:directory?).count).to eq(1)
        # rubocop:enable Performance/Count
      end
    end
  end

  describe '#bulk_execute' do
    context 'when a device has non-working sftp config' do
      let(:devices) do
        [
          create(:device, :folder_sftp_faulty, user_identifiers: name_abbrs[0..0], data_count: 2 * data_count),
          create(
            :device,
            :file_sftp_faulty,
            datacollector_user_level_selected: true,
            user_identifiers: name_abbrs[0..0],
            data_count: 2 * data_count,
          ),
          create(:device, :folder_local, user_identifiers: name_abbrs[0..0], data_count: data_count),
        ]
      end

      it 'bypasses faulty devices' do
        expect do
          described_class.bulk_execute(devices)
        end.to change(Attachment, :count).by(data_count)
      end
    end
  end
  describe 'when a file cannot be deleted' do
    let(:device) do
      create(:device, :file_sftp)
    end
    let(:read_only_data) do
      build(:data_for_file_collector,
            device: device, user_identifiers: name_abbrs[0..0], data_count: data_count, mode: 0o755, file_mode: 0o644)
    end

    it 'does not process the file twice' do
      collector = described_class.new(device)
      file_count = read_only_data.glob('**/*').select(&:file?).size
      byebug
      expect(file_count).to eq(data_count)

      expect { 3.times { collector.execute } }.to change(Attachment, :count).by(data_count)
      expect(read_only_data.glob('**/*').select(&:file?).size).to eq(file_count)
    end
  end
end
