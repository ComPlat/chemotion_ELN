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
    }.freeze

    # (see COLLECTOR_METHODS_HASH)
    COLLECTOR_METHODS = COLLECTOR_METHODS_HASH.keys.freeze

    # @return [OrderedOptions] the datacollector configuration
    def self.config
      Rails.configuration.datacollectors
    end

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
    # @return [Hash] the SFTP arguments
    def sftp_options_for_device
      options = {}
      case device.datacollector_authentication
      when 'keyfile'
        options[:keys] = key_path_for_device
        options[:keys_only] = true
      when 'password'
        options[:password] = password_for_device
      else
        log.info(__method__, 'connection method is unknown!')
      end

      if options[:password].blank? && options[:keys].blank?
        log.info(__method__, 'No valid host or no password or key file found!')
        return {}
      end
      options
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
    def key_path_for_device
      key_dir = Pathname.new(config.keydir)
      key_dir = Rails.root.join(key_dir) if key_dir.relative?
      key_name = Pathname.new(device.datacollector_key_name)
      key_name = key_dir.join(key_name) if key_name.relative?
      # confirm key path is in the keydir
      key_name.realpath.to_s.start_with?(key_dir.realpath.to_s) ? key_name.to_s : nil
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
  end
end
