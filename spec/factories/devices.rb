# frozen_string_literal: true

FactoryBot.define do
  factory :device do
    sequence(:email) { |n| "device#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    name { 'Device One' }
    sequence(:name_abbreviation) { "D#{SecureRandom.alphanumeric(3)}" }
    encrypted_password { 'testtest' }

    trait :file_local do
      datacollector_fields { true }
      datacollector_method { 'filewatcherlocal' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
    end

    trait :file_sftp do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_user { ENV['DATACOLLECTOR_TEST_USER'].presence || 'testuser' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { "#{Dir.home}/.ssh/id_test" }
      datacollector_number_of_files { 1 }
    end

    trait :file_sftp_password do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_user { ENV['DATACOLLECTOR_TEST_USER'].presence || 'user1' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
    end

    trait :file_sftp_faulty do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_user { 'dummy' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { "#{Dir.home}/.ssh/id_test" }
      datacollector_number_of_files { 1 }
    end

    trait :folder_local do
      datacollector_fields { true }
      datacollector_method { 'folderwatcherlocal' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
    end

    trait :folder_sftp do
      datacollector_fields { true }
      datacollector_method { 'folderwatchersftp' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_user { ENV['DATACOLLECTOR_TEST_USER'].presence || 'testuser' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { "#{Dir.home}/.ssh/id_test" }
      datacollector_number_of_files { 1 }
    end

    trait :folder_sftp_faulty do
      datacollector_fields { true }
      datacollector_method { 'folderwatchersftp' }
      datacollector_dir { Rails.root.join("/tmp/datacollector/#{name_abbreviation}") }
      datacollector_user { 'dummy' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { "#{Dir.home}/.ssh/id_test" }
      datacollector_number_of_files { 1 }
    end

    trait :novnc_settings do
      novnc_target { '127.0.0.1' }
      novnc_token { 'test' }
    end

    before(:create) do |device|
      keyfile = device.datacollector_key_name

      if keyfile.present?
        dir = Pathname.new(Dir.home).join('.ssh')
        FileUtils.mkdir_p(dir) unless File.directory?(dir)
        FileUtils.cp(Rails.root.join('spec/fixtures/datacollector/id_test'), dir)
      end
    end

    before(:create) do |device|
      destination = device.datacollector_dir

      if destination.present?
        dir = if device.datacollector_method.include? 'folder'
                Pathname.new(destination).join("CU1-#{Time.now.to_i}")
              else
                destination
              end

        FileUtils.mkdir_p(dir) unless File.directory?(dir)
        FileUtils.cp(Rails.root.join('spec/fixtures/CU1-folder/CU1-abc.txt'), dir)
      end
    end
  end
end
