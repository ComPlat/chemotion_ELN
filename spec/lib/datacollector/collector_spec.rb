# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Datacollector::Collector, type: :model do
  let(:users) { create_list(:person, 2) }
  let(:users_unknown) { build_list(:person, 1) }
  let(:name_abbrs) { (users + users_unknown).map(&:name_abbreviation) }
  let(:emails) { (users + users_unknown).map(&:email) }
  let(:file_count) { 1 }

  # rubocop:disable RSpec/BeforeAfterAll
  after(:all) do
    Pathname.new(Rails.configuration.datacollectors.dig(:localcollectors, 0, :path)).rmtree
  end
  # rubocop:enable RSpec/BeforeAfterAll

  describe '.execute' do
    # @todo context sftp-keyfile-authentication and sftp-password-authentication
    # @todo context undeletable files and bypassing them / registering collector errors

    shared_examples 'a working collector without user directories' do
      it 'executes and writes the correct number of files in database' do
        collector = described_class.new(device)

        expect(Dir).not_to be_empty(collector.collector_dir)
        expect { collector.execute }.to change(Attachment, :count).by(file_count * users.count)
        expect(Dir).to be_empty(collector.collector_dir)
      end
    end

    shared_examples 'a working collector with user directories' do
      it 'executes and writes the correct number of files in database' do
        collector = described_class.new(device)
        path = File.join(collector.collector_dir, users.first.name_abbreviation)
        path_unknown = File.join(collector.collector_dir, users_unknown.first.name_abbreviation)

        expect(Dir.empty?(path) || Dir.empty?(path_unknown)).to be_falsey
        expect { collector.execute }.to change(Attachment, :count).by(file_count * users.count)
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
              user_identifiers: name_abbrs,
              file_count: file_count,
            )
          end

          example = "a working collector with#{user_level ? '' : 'out'} user directories"
          it_behaves_like example
        end
      end
    end

    context 'when folder is not ready for collection' do
      let(:device) do
        create(
          :device,
          :folder_local,
          datacollector_number_of_files: 2,
          user_identifiers: name_abbrs,
          file_count: file_count,
        )
      end

      it 'does not process the folder' do
        collector = described_class.new(device)

        expect { collector.execute }.not_to change(Attachment, :count)
      end
    end
  end

  describe '#bulk_execute' do
    context 'when a device has non-working sftp config' do
      let(:device_sftp_faulty) { create(:device, :folder_sftp_faulty) }
      let(:device) { create(:device, :folder_local, user_identifiers: name_abbrs, file_count: file_count) }

      it 'bypasses faulty devices' do
        expect do
          described_class.bulk_execute([device_sftp_faulty, device])
        end.to change(Attachment, :count).by(file_count * users.count)
      end
    end
  end
end
