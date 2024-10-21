# frozen_string_literal: true

# utility lambdas to create files and folders:
random_string = ->(length) { SecureRandom.alphanumeric(length) }

mk_file = lambda do |destination, prefix = nil|
  path = if prefix
           Pathname.new(destination).join(
             "#{prefix}-#{File.basename(Faker::File.file_name(ext: 'chemotion'))}",
           ).to_s
         else
           Faker::File.file_name(ext: 'chemotion', dir: destination)
         end
  FileUtils.touch(path) && path
end

mk_folder = lambda do |destination, segment = true, prefix = nil|
  path = if prefix && segment
           Pathname.new(destination).join("#{prefix}-#{Faker::File.dir(segment_count: 1)}").to_s
         elsif segment
           Faker::File.dir(root: destination, segment_count: 1)
         else
           destination
         end
  FileUtils.mkdir_p(path) && path
end

mk_folder_and_file = lambda do |destination, segment = true, file_prefix = nil, folder_prefix = nil|
  dir = mk_folder.call(destination, segment, folder_prefix)
  mk_file.call(dir, file_prefix)
end

default_sftp_user = ENV['DATACOLLECTOR_TEST_USER'].presence || 'testuser' # `whoami`.strip
default_datacollector_dir = Pathname.new(
  ENV['DATACOLLECTOR_TEST_DIR'].presence ||
  File.join(Rails.configuration.datacollectors.dig(:localcollectors, 0, :path), 'test'),
)
default_sftp_key_name = ENV['DATACOLLECTOR_TEST_KEY'].presence || 'id_test'

FactoryBot.define do
  factory :device do
    sequence(:email) { |n| "device#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    name { 'Device One' }
    sequence(:name_abbreviation) { "D#{random_string.call(3)}" }

    transient do
      # user_identifiers: array of user identifiers to be used for generating folders and files
      user_identifiers { [] }
      # file_count: number of files or folder to be generated per user identifier
      file_count { 1 }
    end

    trait :file_local do
      datacollector_fields { true }
      datacollector_method { 'filewatcherlocal' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :file_sftp do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_user { default_sftp_user }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { default_sftp_key_name }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :file_sftp_password do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_user { default_sftp_user }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :file_sftp_faulty do
      datacollector_fields { true }
      datacollector_method { 'filewatchersftp' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_user { 'dummy' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { default_sftp_key_name }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :folder_local do
      datacollector_fields { true }
      datacollector_method { 'folderwatcherlocal' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_authentication { 'password' }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :folder_sftp do
      datacollector_fields { true }
      datacollector_method { 'folderwatchersftp' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_user { default_sftp_user }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { default_sftp_key_name }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :folder_sftp_faulty do
      datacollector_fields { true }
      datacollector_method { 'folderwatchersftp' }
      datacollector_dir { default_datacollector_dir.join(name_abbreviation) }
      datacollector_user { 'dummy' }
      datacollector_host { '127.0.0.1' }
      datacollector_authentication { 'keyfile' }
      datacollector_key_name { default_sftp_key_name }
      datacollector_number_of_files { 1 }
      datacollector_user_level_selected { false }
    end

    trait :novnc_settings do
      novnc_target { '127.0.0.1' }
      novnc_token { 'test' }
    end

    # before(:create) do |device|
    #   keyfile = device.datacollector_key_name

    #   if keyfile.present?
    #     dir = Pathname.new(Dir.home).join('.ssh')
    #     FileUtils.mkdir_p(dir) unless File.directory?(dir)
    #     FileUtils.cp(Rails.root.join('spec/fixtures/datacollector/id_test'), dir)
    #   end
    # end

    before(:create) do |device, evaluator|
      dir = device.datacollector_dir
      x = evaluator.file_count
      if dir.present? && evaluator.user_identifiers.present?
        evaluator.user_identifiers.each do |user_identifier|
          if device.datacollector_user_level_selected
            user_dir = Pathname.new(dir).join(user_identifier).to_s
            args = [user_dir] if device.datacollector_method.include? 'folder'
            args = [user_dir, false] if device.datacollector_method.include? 'file'
          else
            args = [dir, true, nil, user_identifier] if device.datacollector_method.include? 'folder'
            args = [dir, false, user_identifier] if device.datacollector_method.include? 'file'
          end
          x.times { mk_folder_and_file.call(*args) }
        end
      end
    end
  end
end
