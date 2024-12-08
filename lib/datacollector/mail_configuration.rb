# frozen_string_literal: true

# @todo: DRY validation from AR Device model
module Datacollector
  # Dummy device for mail collector
  MailDevice = Struct.new(
    'MailDevice', :datacollector_method, :info,
    # unused attributes:
    :datacollector_dir, :datacollector_user_level_selected, :datacollector_number_of_files,
    :datacollector_host, :datacollector_user, :datacollector_authentication, :datacollector_key_name
  )

  # Configuration class for the Mailcollector
  # @note: This class is used to validate the configuration of the mailcollector
  class MailConfiguration < Datacollector::Configuration
    attr_reader :server, :mail_address, :password, :aliases, :port, :ssl

    # Get the email configuration
    #
    # @return [Hash] the email configuration
    def initialize(device = MailDevice.new('mailcollector', 'Mail Collector'))
      super

      mail_config = config&.mailcollector
      raise 'No mailcollector configuration!' if mail_config.blank?

      @server = mail_config[:server]
      @mail_address = mail_config[:mail_address]
      @password = mail_config[:password]
      @aliases = mail_config[:aliases] || []
      @port = mail_config.key?(:port) ? mail_config[:port] : 993
      @ssl = mail_config.key?(:ssl) ? mail_config[:ssl] : true
    end
  end
end
