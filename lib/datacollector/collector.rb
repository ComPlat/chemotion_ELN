# frozen_string_literal: true

# @todo: move config logic to config class and DRY validation from AR Device model
module Datacollector
  # File and Folder Collector:
  # Inspects the Devices' folders for new files and collect them to ELN user account if possible
  #
  # @!attribute [r] device
  #   @return [Device] AR Device
  # @!attribute [r] config
  #   @return [Datacollector::Configuration] The configuration for the device
  #
  class Collector
    # Execute the collection for devices
    # @param devices [Array<Device>] the devices to collect data from
    # @option allowed_methods [Array<String>] only allow collection for given methods
    def self.bulk_execute(devices, allowed_methods: [])
      logger = DCLogger.new(__method__)
      devices.each do |device|
        new(device).execute(allowed_methods: allowed_methods)
      rescue Errors::DatacollectorError, SFTPClientError => e
        logger.error(device.info, e.message)
      end
    end

    attr_reader :device, :config

    # Initialize the collector with a device
    #
    # @param [Device] an object responding to the following methods:
    #  - datacollector_method (String) the method to use for data collection (see COLLECTOR_METHODS)
    #  - datacollector_dir (String) the directory path to inspect
    #  - datacollector_user_level_selected (Boolean) whether to inspect the user level folders
    #  - datacollector_number_of_files (Integer) the number of files to collect (folderwatcher only)
    #  - datacollector_host (String) the host to connect to over sftp (sftp watcher only)
    #  - datacollector_user (String) the user to connect to the SFTP server (sftp watcher only)
    #  - datacollector_authentication (String) the authentication method to use
    #     (password or keyfile - sftp watcher only)
    #  - datacollector_key_name (String) file name of the key file to use (sftp watcher only - keyfile authentication)
    #  - info (String) additional information about the device
    def initialize(device)
      @device = device
      @config = Configuration.new!(device)
    end

    # config aliases
    delegate :collector_dir, to: :config
    delegate :expected_count, to: :config
    delegate :file_collector?, to: :config
    delegate :log, to: :config
    delegate :sftp, to: :config

    ##################################################################
    # Collector main execution
    ##################################################################

    # Executes the appropriate method based on the use_sftp attribute
    #
    # @param method [String] skip execution if the provided method is not the same as the device's method
    def execute(allowed_methods: [])
      return if allowed_methods.present? && allowed_methods.exclude?(method)

      device.datacollector_user_level_selected ? inspect_user_folders : inspect_folder
    end

    private

    ##################################################################
    # Inspection and collection methods
    ##################################################################

    # Build the Correspondence object based on a device and a path
    #
    # @param device [Device] the device sending the file
    # @param path [Datacollector::CollectorFile] the collector file
    # @param delete [Boolean] whether to delete the file or dir IF no instance of Correspondence is returned
    # @return [Datacollector::Correspondence] the Correspondence object
    def correspondence_by_file(device, file)
      Correspondence.new(device, file.path)
    rescue Errors::DatacollectorError => e
      log.info(__method__, e.message)
      false
    end

    # Inspects user folders for new folders and processes them.
    # The directory should have the following structure:
    #   path/to/device/datacollector_dir
    #   |
    #   |__user1_identifier
    #   |  |__ file_or_dir1
    #   |  |__ file_or_dir2
    #   |
    #   |__user2_identifier
    #   |  |__ file_or_dir3
    #   |  |__ file_or_dir4
    #   |     ...
    # @param device [Device] the device to inspect
    # @note user folders are expected to be at the top level of the collector directory
    #   and are not deleted after processing even if no correspondence is found
    def inspect_user_folders
      new_folders(collector_dir).each do |user_dir|
        correspondence = correspondence_by_file(device, user_dir)
        next unless correspondence

        inspect_folder(user_dir.to_s, correspondence: correspondence)
      end
    end

    # Inspects the folder for new folders and processes them
    ## The directory should have the following structure if no correspondence is provided:
    #   path/to/device/datacollector_dir
    #   |
    #   |__ user1_identifier-file_or_dir1
    #   |__ user1_identifier-file_or_dir2
    #   |__ user2_identifier-file_or_dir3
    #   |__ user2_identifier-file_or_dir4
    #   ....
    # @param dir [String] the directory path to inspect
    # @param correspondence [Datacollector::Correspondence] the correspondence collector
    # @note folders/files are expected to be at the top level of the collector directory
    #   and are deleted after processing whether a correspondence is found or not
    def inspect_folder(dir = collector_dir, correspondence: nil)
      new_files_or_folders(dir).each do |file|
        next if previous_failure?(file)
        next unless ready?(file)

        current_correspondence = correspondence || correspondence_by_file(device, file)
        attach_file_or_folder(current_correspondence, file)
      rescue StandardError => e
        log.error(e.message, e.backtrace.join('\n'))
      end
    end

    # Define which attacher to use and use it
    #
    # @param (@see #attach_file) or (@see #attach_folder)
    def attach_file_or_folder(correspondence, file)
      if correspondence
        file.directory? ? attach_folder(correspondence, file) : attach_file(correspondence, file)
      end
      try_delete_or_create_error(file)
    end

    # Find top level files or folders in the directory depending on the collector method
    #
    # @param dir [String] the directory to inspect, defaults to the device's directory
    # @return [Array<Datacollector::CollectorFile>] the files or folders
    def new_files_or_folders(dir = nil)
      file_collector? ? new_files(dir) : new_folders(dir)
    end

    # Retrieves new directories in the monitored path.
    #
    # @param dir_path [String] The path to the directory being monitored.
    # @return [Array<String>] An array of new directory paths found in the specified directory.
    def new_folders(dir)
      CollectorFile.entries(dir, dir_only: true, top_level: true, sftp: @sftp) || []
    end

    # Gets the new files in the monitored folder
    #
    # @return [Array<String>] the list of files
    def new_files(dir)
      CollectorFile.entries(dir, file_only: true, top_level: true, sftp: @sftp)
                   &.reject { |file| file.to_s.end_with?('.filepart', '.part') } || []
    end

    # Collect and create an attachment of the folder:
    #   Zip the folder locally and attach the zip file and
    #   try to delete the original folder after attaching the zip file.
    #
    # @param correspondence [Datacollector::Correspondence] the collector correspondence
    # @param folder [Datacollector::CollectorFile] the folder to attach
    def attach_folder(correspondence, folder)
      tmp_zip = folder.to_zip
      name = folder.name
      correspondence.attach("#{name}.zip", tmp_zip.path, name)
      log.info('Stored', name)
    ensure
      cleanup_tempfile(tmp_zip) if tmp_zip
    end

    # Collect and create an attachment of the file:
    #  Download the file locally if remote and attach it, then
    #  try to delete the original file after attaching it.
    #
    # @param correspondence [Datacollector::Correspondence] the collector correspondence
    # @param folder [Datacollector::CollectorFile] the file to attach
    def attach_file(correspondence, file)
      local_file = file.as_local_file
      name = file.name
      correspondence.attach(name, local_file.path)
      log.info('Stored', name)
    ensure
      cleanup_tempfile(local_file) if local_file
    end

    # Clean up the tempfile if it exists
    # @param file_data [String, Tempfile] The file content or tempfile
    def cleanup_tempfile(file)
      return unless file.is_a?(Tempfile)

      file.close
      file.unlink
    end

    def try_delete(fstruct)
      fstruct.delete!
    rescue StandardError => e
      log.error(__method__, "#{fstruct.path} >>> #{e.message}")
      false
    end

    def try_delete_or_create_error(file)
      try_delete(file) || CollectorError.find_or_create_by_path(file.path, file.mtime)
    end

    def previous_failure?(file)
      return false unless CollectorError.find_by_path(file.path, file.mtime)

      try_delete(file)
      true
    end

    # Get the modification time difference for the folder/file offset by the wait time for the dc method
    # @param [CollectorFile]
    # @return [Integer] the modification time difference in seconds (positive if the folder/ is ready for collection)
    def modification_time_diff(folder)
      Time.zone.now - folder.mtime - config.sleep_time
    end

    # Wait some time before if dir just created and no fixed number of files expected
    def ready?(path)
      return log.info(__method__, 'Folder not ready!') && false unless modification_time_diff(path).positive?
      return true if expected_count.zero? || file_collector?

      path.directory? && correct_file_count?(path.file_count)
    end

    # Check if the folder is ready for collection
    #   compare the number of files in the folder with the expected number set in the device config
    def correct_file_count?(file_count)
      return true if expected_count.zero?

      file_count == expected_count || (log.info(__method__, 'Wrong number of files!') && false)
    end
  end
end
