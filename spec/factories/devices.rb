# frozen_string_literal: true

DC_SFTP_USER = ENV['DATACOLLECTOR_FACTORY_SFTP_USER'].presence || 'testuser'
DC_DIR       = ENV['DATACOLLECTOR_FACTORY_DIR'].presence ||
               Rails.configuration.datacollectors.dig(:localcollectors, 0, :path)
DC_SFTP_KEY  = ENV['DATACOLLECTOR_FACTORY_SFTP_KEY'].presence || 'id_test'
DC_SFTP_HOST = ENV['DATACOLLECTOR_FACTORY_SFTP_HOST'].presence || '127.0.0.1'

FactoryBot.define do
  factory :device do
    sequence(:email) { |n| "device#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    name { 'Device One' }
    sequence(:name_abbreviation) { "D#{SecureRandom.alphanumeric(3)}" }

    # passthrough parameters for data factory
    transient do
      # user_identifiers: array of user identifiers to be used for generating folders and files
      user_identifiers { [] }
      # data_count: number of data folders or data files to be generated per user identifier
      data_count { 1 }
      # file_count: number of files or folder to be generated per user identifier
      file_count { 1 }
    end

    trait :collector do
      datacollector_fields { true }
      datacollector_dir do
        File.join(
          DC_DIR,
          "#{name_abbreviation}-#{datacollector_method}#{datacollector_user_level_selected ? '-user' : ''}",
        ).to_s
      end
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
      datacollector_authentication { 'password' }
    end

    trait :sftp_collector do
      collector
      datacollector_host { DC_SFTP_HOST }
      datacollector_user { DC_SFTP_USER }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { DC_SFTP_KEY }
    end

    trait :file_local do
      datacollector_method { 'filewatcherlocal' }
      collector
    end

    trait :folder_local do
      datacollector_method { 'folderwatcherlocal' }
      collector
    end

    trait :file_sftp do
      datacollector_method { 'filewatchersftp' }
      sftp_collector
    end

    trait :folder_sftp do
      datacollector_method { 'folderwatchersftp' }
      sftp_collector
    end

    trait :file_sftp_password do
      sftp_collector
      datacollector_authentication { 'password' }
      datacollector_key_name { nil }
    end

    trait :file_sftp_faulty do
      file_sftp
      datacollector_user { 'dummy' }
    end

    trait :folder_sftp_faulty do
      folder_sftp
      datacollector_user { 'dummy' }
      datacollector_host { '127.0.0.1:443' }
    end

    trait :novnc_settings do
      novnc_target { '127.0.0.1' }
      novnc_token { 'test' }
    end

    before(:create) do |device, evaluator|
      # create datacollector_dir if it is set
      if device.datacollector_dir.present?
        build(:data_folder, root: device.datacollector_dir, name: '', mode: 0o755)
        if evaluator.user_identifiers.present?
          build(
            :data_for_collector,
            device: device,
            user_identifiers: evaluator.user_identifiers,
            data_count: evaluator.data_count,
            file_count: evaluator.file_count,
          )
        end
      end
    end
  end
end
