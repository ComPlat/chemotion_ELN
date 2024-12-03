# frozen_string_literal: true

# those require statements are uneccessary in test environment but
# enable the single factory to be loaded in development environment
require 'faker'
require 'factory_bot'

FactoryBot.define do
  # Build a Pathname object for a file
  #  optionally create the file with touch or cp from another location
  # @param [String] prefix - prefix for the filename
  # @param [String] ext - extension for the file
  # @param [Pathname] root - root directory for the file
  # @param [Boolean] touch - create the file with touch
  # @param [Pathname] copy_from - copy the file from another location
  # @param [String] mode - file permissions
  # @example
  #  build(:data_file, prefix: 'test', ext: 'txt', root: Pathname.new('/tmp'))
  #  # => #<Pathname:/tmp/test-123.txt>
  factory :data_file, class: Pathname do
    transient do
      prefix { nil }
      ext { 'chemotion' }
      name  { File.basename(Faker::File.file_name(ext: ext)) }
      root { nil }
      touch { true } # rubocop:disable Rails/SkipsModelValidations
      copy_from { nil }
      mode { 0o600 }
    end

    initialize_with do
      pathname = Pathname.new(prefix ? "#{prefix}-#{name}" : name)
      pathname = root.join(pathname) if root
      FileUtils.touch(pathname) if touch # rubocop:disable Rails/SkipsModelValidations
      FileUtils.cp(copy_from, pathname) if copy_from
      pathname.chmod(mode) if touch || copy_from # rubocop:disable Rails/SkipsModelValidations
      pathname
    end
  end

  # Build a Pathname object for a folders, optionally:
  #  - create the folder with mkdir
  #  - populate the folder with dummy files
  # @param [String] prefix - prefix for the folder name
  # @param [String] name - name of the folder
  # @param [Pathname] root - root directory for the folder
  # @param [Boolean] mkdir - create the folder with mkdir_p
  # @param [Integer] mode - folder permissions
  # @param [Integer] file_count - number of dummy files to create
  # @param [Integer] segment_count - number of additional segments in the folder path
  factory :data_folder, class: Pathname do
    transient do
      prefix { nil }
      name { Faker::File.dir(segment_count: 1) }
      root { nil }
      segment_count { 0 }
      mkdir { true }
      mode { 0o700 }
      file_mode { 0o600 }
      file_count { 0 }
    end

    trait :with_files do
      file_count { 2 }
    end

    initialize_with do
      pathname = Pathname.new(Faker::File.dir(root: root, segment_count: segment_count))
                         .join(prefix ? "#{prefix}-#{name}" : name.to_s)
      FileUtils.mkdir_p(pathname, mode: mode) if mkdir
      FileUtils.chmod(mode, pathname) if mkdir
      build_list(:data_file, file_count, root: pathname, touch: mkdir, mode: file_mode)

      pathname
    end
  end

  # Build a Pathname object for a parent folder
  #  populate the folder with folders [DataFolder]
  #  @return [Pathname] - the parent folder only
  factory :data_folder_parent, parent: :data_folder do
    transient do
      prefixes { [] }
      data_count { 1 }
    end
    initialize_with do
      pathname = build(:data_folder, prefix: prefix, name: name, root: root, mode: mode)
      prefixes.map do |prefix|
        build_list(
          :data_folder,
          data_count,
          root: pathname,
          prefix: prefix,
          file_count: file_count,
          mode: mode,
          file_mode: file_mode,
        )
      end
      pathname
    end
  end

  # Build a Pathname object for a parent folder
  #   populate the folder with files [DataFile]
  # @return [Pathname] - the parent folder
  factory :data_file_parent, parent: :data_folder_parent do
    initialize_with do
      pathname = build(:data_folder, prefix: prefix, name: name, root: root, mode: mode)
      prefixes.map do |prefix|
        build_list(
          :data_file,
          data_count,
          root: pathname,
          prefix: prefix,
          mode: file_mode,
        )
      end
      pathname
    end
  end

  factory :data_for_folder_collector, parent: :data_folder_parent do
    transient do
      device { nil }
      user_identifiers { [] }
      name { '' }
      data_count { 1 }
      file_count { 1 }
      prefixes { user_identifiers }
      root { device&.datacollector_dir }
    end
  end

  factory :data_for_folder_collector_with_user_level, parent: :data_for_folder_collector do
    initialize_with do
      pathname = build(:data_folder, prefix: prefix, name: name, root: root, mode: mode)
      user_identifiers.map do |username|
        user_path = build(:data_folder, name: username, root: pathname, mode: mode)
        build_list(
          :data_folder,
          data_count,
          root: user_path,
          file_count: file_count,
          mode: mode,
          file_mode: file_mode,
        )
      end
      pathname
    end
  end

  factory :data_for_file_collector, parent: :data_file_parent do
    transient do
      device { nil }
      user_identifiers { [] }
      name { '' }
      data_count { 1 }
      prefixes { user_identifiers }
      root { device.datacollector_dir }
    end
  end

  factory :data_for_file_collector_with_user_level, parent: :data_for_file_collector do
    initialize_with do
      pathname = build(:data_folder, prefix: prefix, name: name, root: root, mode: mode)
      user_identifiers.map do |username|
        user_path = build(:data_folder, name: username, root: pathname, mode: mode)
        build_list(
          :data_file,
          data_count,
          root: user_path,
          mode: file_mode,
        )
      end
      pathname
    end
  end

  factory :data_for_collector, class: Pathname do
    transient do
      device { nil }
      user_identifiers { [] }
      data_count { 1 }
      file_count { 1 }
    end
    initialize_with do
      params = {
        device: device,
        user_identifiers: user_identifiers,
        data_count: data_count,
        file_count: file_count,
      }
      sftp_params = {
        **params,
        mode: 0o777,
        file_mode: 0o666,
      }

      case device.datacollector_method.concat(device.datacollector_user_level_selected ? 'user' : '')
      when 'folderwatcherlocal'
        build(:data_for_folder_collector, **params)
      when 'folderwatcherlocaluser'
        build(:data_for_folder_collector_with_user_level, **params)
      when 'folderwatchersftp'
        build(:data_for_folder_collector, **sftp_params)
      when 'folderwatchersftpuser'
        build(:data_for_folder_collector_with_user_level, **sftp_params)
      when 'filewatcherlocal'
        params.delete(:file_count)
        build(:data_for_file_collector, **params)
      when 'filewatcherlocaluser'
        params.delete(:file_count)
        build(:data_for_file_collector_with_user_level, **params)
      when 'filewatchersftp'
        sftp_params.delete(:file_count)
        build(:data_for_file_collector, **sftp_params)
      when 'filewatchersftpuser'
        sftp_params.delete(:file_count)
        build(:data_for_file_collector_with_user_level, **sftp_params)
      end
    end
  end
end
