# frozen_string_literal: true

# @todo: DRY validation from AR Device model
module Datacollector
  # Configuration class for the Datacollector
  # @note: This class is used to validate the configuration of the datacollector
  class Configuration
    # Collectors Method types and description
    COLLECTOR_METHODS_HASH = {
      'filewatchersftp' => 'file watcher over sftp',
      'folderwatchersftp' => 'folder watcher over sftp',
      'filewatcherlocal' => 'file watcher over local fs',
      'folderwatcherlocal' => 'folder watcher over local fs',
      # 'mailcollector' => 'mail collector',
    }.freeze

    # (see COLLECTOR_METHODS_HASH)
    COLLECTOR_METHODS = COLLECTOR_METHODS_HASH.keys.freeze

    # @return [OrderedOptions] the datacollector configuration
    def self.config
      Rails.configuration.datacollectors
    end

    # Validate the configuration and return a new config instance given a device
    #
    # @return [Configuration] the configuration object
    def self.new!(...)
      new(...).validate
    end

    # Get the sleep time for the watcher
    #
    # @param method [String] the method to get the sleep time for

    # @return [Integer] the sleep seconds, default is 5
    def self.sleep_time(method = nil)
      return 20 if method.blank?

      config.services&.find { |service| service[:name] == method }
            &.dig(:watcher_sleep)&.to_i || 20
    end

    # @return [Device] the device to collect from
    attr_reader :device, :log

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
      @log = DCLogger.new(device.info)
      @sftp = nil
    end

    def validate
      info = device.info
      raise Errors::DatacollectorError, 'No datacollector system configuration!' if config.blank?
      raise Errors::DatacollectorError, "Invalid collector-method! #{info}" if collector_method.blank?
      raise Errors::DatacollectorError, "No openable SFTP client for #{info}!" if sftp_collector? && !sftp.open?
      raise Errors::DatacollectorError, "Not a valid sftp dir for #{info}!" unless valid_sftp_dir?(collector_dir)
      raise Errors::DatacollectorError, "Not a valid local dir for #{info}!" unless valid_local_dir?(collector_dir)

      self
    end

    ##################################################################
    # some device attributes aliases
    ##################################################################

    # @return [OrderedOptions] the datacollector configuration
    def config
      @config ||= self.class.config
    end

    def collector_dir
      device.datacollector_dir.to_s
    end

    def expected_count
      device.datacollector_number_of_files.to_i
    end

    # The current collector method
    #
    # @return [String] the collector method
    def collector_method
      @collector_method ||= COLLECTOR_METHODS.find { |m| m == device.datacollector_method }
    end

    # Sleep time for the watcher
    # @return [Integer] the sleep time in seconds
    # @note: default is 5 seconds
    def sleep_time
      self.class.sleep_time(collector_method)
    end

    ##################################################################
    # collector_method validations
    ##################################################################

    # @return [Boolean] whether the collector method is on local file system
    def local_collector?
      collector_method.end_with?('local')
    end

    # @return [Boolean] whether the collector method is over sftp
    def sftp_collector?
      collector_method.end_with?('sftp')
    end

    # @return [Boolean] whether the collector method is for file
    def file_collector?
      collector_method.start_with?('file')
    end

    # Validate for sftp collector that dir is accessible
    #
    # @param dir [String] the directory to validate
    # @return [Boolean] whether the directory is allowed
    def valid_sftp_dir?(dir)
      return true unless sftp_collector?

      CollectorFile.new!(dir, sftp: sftp) && true
    rescue ArgumentError
      false
    end

    # Validate for local collector that dir is in the allowed directories list as defined in the configuration
    #
    # @param dir [String] the directory to validate
    # @return [Boolean] whether the directory is allowed
    def valid_local_dir?(dir)
      return true unless local_collector?

      config.localcollectors.any? do |local|
        root = Pathname(local[:path]).realpath.to_s
        Pathname(dir).realpath.to_s.start_with?(root)
      end
    rescue Errno::ENOENT
      false
    end

    # Get the SFTPClient options for the device
    #
    # @param device [Device] the device to get SFTP arguments for
    # @return [Hash] the SFTP arguments, empty if no password is found or the connection method is unknown
    # @raise [Errors::DatacollectorError] if the key file of a keyfile device is not usable
    #   (see {#key_path_for_device})
    def sftp_options_for_device
      case device.datacollector_authentication
      when 'keyfile'
        # an Array, as SFTPClient splits a String of keys on commas
        { keys: [key_path_for_device], keys_only: true }
      when 'password'
        password = password_for_device
        log.info(__method__, 'No password found!') if password.blank?
        password.present? ? { password: password } : {}
      else
        log.info(__method__, 'connection method is unknown!')
        {}
      end
    end

    # Get the password for the device
    #
    # @return [String] the password
    def password_for_device
      config.sftpusers&.find { |entry| entry[:user] == device.datacollector_user }&.fetch(:password, nil)
    end

    # Get the key path for the device
    #
    # @return [String] the absolute path to the key
    # @raise [Errors::DatacollectorError] if no key name or key directory is set, the key directory does not
    #   exist, or the key file does not exist, cannot be read or is outside the key directory
    def key_path_for_device
      key_name = device.datacollector_key_name
      raise Errors::DatacollectorError, 'No key file name set!' if key_name.blank?

      key_dir = key_dir_path
      key_path = key_path_in(key_dir, key_name)
      check_key_file(key_path, key_dir)
      key_path.to_s
    end

    ##################################################################
    ## SFTP
    ##################################################################

    # Initialize the SFTP client for the device
    #
    # @param device [Device] the device to initialize the SFTP client for
    # @return [SFTPClient] the SFTP client
    def sftp
      return unless sftp_collector?

      @sftp ||= SFTPClient.new(
        device.datacollector_host,
        device.datacollector_user,
        **sftp_options_for_device,
      )
    end

    private

    # Resolved path of the configured key directory, a relative one being resolved against +Rails.root+
    #
    # @return [Pathname] the key directory, symlinks resolved
    # @raise [Errors::DatacollectorError] if no key directory is configured, or it does not exist or cannot be read
    def key_dir_path
      raise Errors::DatacollectorError, 'No datacollector key directory (keydir) configured!' if config.keydir.blank?

      key_dir = Pathname.new(config.keydir)
      key_dir = Rails.root.join(key_dir) if key_dir.relative?
      raise Errors::DatacollectorError, "Key directory #{key_dir} not found!" unless key_dir.directory?

      key_dir.realpath
    rescue ArgumentError
      raise Errors::DatacollectorError, 'Invalid key directory (keydir)!'
    rescue SystemCallError => e
      raise Errors::DatacollectorError, "Key directory #{key_dir} not readable: #{e.message}"
    end

    # Path of a key file in the key directory, checked on the path alone before the file is looked at
    #
    # @param key_dir [Pathname] the resolved key directory
    # @param key_name [String] the key file name, relative to the key directory or absolute
    # @return [Pathname] the key path
    # @raise [Errors::DatacollectorError] if the key name is not a valid path or not inside the key directory
    def key_path_in(key_dir, key_name)
      # Pathname#join keeps an absolute key name as is
      key_path = key_dir.join(key_name).cleanpath
      raise Errors::DatacollectorError, "Key file #{key_path} is outside #{key_dir}!" unless in_dir?(key_path, key_dir)

      key_path
    rescue ArgumentError
      raise Errors::DatacollectorError, 'Invalid key file name!'
    end

    # Checks that the key file exists, can be read and, symlinks resolved, stays inside the key directory
    #
    # @param key_path [Pathname] the key path
    # @param key_dir [Pathname] the resolved key directory
    # @raise [Errors::DatacollectorError] if one of the checks fails
    def check_key_file(key_path, key_dir)
      raise Errors::DatacollectorError, "Key file #{key_path} not found!" unless key_path.stat.file?
      raise Errors::DatacollectorError, "Key file #{key_path} not readable!" unless key_path.readable?
      return if in_dir?(key_path.realpath, key_dir)

      raise Errors::DatacollectorError, "Key file #{key_path} is outside #{key_dir}!"
    rescue Errno::ENOENT
      raise Errors::DatacollectorError, "Key file #{key_path} not found!"
    rescue SystemCallError => e
      raise Errors::DatacollectorError, "Key file #{key_path} not readable: #{e.message}"
    end

    # @param path [Pathname]
    # @param dir [Pathname]
    # @return [Boolean] whether +path+ is +dir+ or lies below it, comparing whole path components
    def in_dir?(path, dir)
      path.ascend.include?(dir)
    end
  end
end
