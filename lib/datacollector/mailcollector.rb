# frozen_string_literal: true

require 'net/imap'
require 'mail'

module Datacollector
  # Class for collecting attachment data from emails
  class Mailcollector
    INBOX = 'INBOX'
    ENVELOPE = 'ENVELOPE'
    RFC822 = 'RFC822'

    def initialize
      parse_mail_data_collector_config
      login
    end

    def parse_mail_data_collector_config
      config = Configuration.config
      raise 'No datacollector configuration!' unless config

      @server = config[:server]
      @mail_address = config[:mail_address]
      @password = config[:password]
      @aliases = config[:aliases] || []
      @port = config.key?(:port) ? config[:port] : 993
      @ssl = config.key?(:ssl) ? config[:ssl] : true
    end

    def imap
      @imap ||= Net::IMAP.new(@server, port: @port, ssl: @ssl)
    end

    def login
      response = imap.login(@mail_address, @password)
      raise unless response['name'] != 'OK'

      log_info('Login...')
      imap.select(INBOX)
    rescue StandardError => e
      log_error("Cannot login #{@server}")
      log_error e.message
      logout
    end

    def logout
      imap.close
      imap.logout
      imap.disconnect
    end

    def execute
      imap.search(%w[NOT SEEN]).each do |message_id|
        fetch_envelope(message_id)
        handle_new_mail(message_id)
      end
    rescue StandardError => e
      log_error e.backtrace.join('\n')
      raise
    ensure
      logout
    end

    private

    def reset_envelope
      @envelope = nil
      @from_email = nil
      @from_user = nil
      @receivers = []
      @event = nil
      @message = nil
    end

    def helper_set
      @helper_set ||= CorrespondenceArray.new(from_user, receivers)
    end

    def fetch_envelope(id)
      reset_envelope
      @envelope = imap.fetch(id, ENVELOPE).first.attr[ENVELOPE]
      @message = Mail.read_from_string raw_message(id)
    end

    attr_reader :envelope

    def raw_message(id)
      imap.fetch(id, RFC822).first.attr[RFC822]
    end

    def handle_new_mail(message_id)
      helper_set.each do |helper|
        if message.attachments
          handle_new_message(message, helper)
          log_info "#{message.from} Data stored!"
        else
          log_info "#{message.from} No data!"
        end
        imap.store(message_id, '+FLAGS', [:Deleted])
        log_info "#{message.from} Email processed!"
      end
    rescue StandardError => e
      log_error 'Error on mailcollector handle_new_mail'
      log_error e.backtrace.join('\n')
    ensure
      reset_envelope
    end

    def handle_new_message(message, helper)
      message.attachments.each do |attachment|
        tempfile = Tempfile.new('mail_attachment')
        tempfile.binmode
        tempfile.write(attachment.decoded)
        tempfile.rewind
        helper.attach(attachment.filename, tempfile.path)
      ensure
        tempfile.close
        tempfile.unlink
      end
    rescue StandardError => e
      log_error 'Error on mailcollector handle_new_message:'
      log_error e.backtrace.join('\n')
      raise
    end

    def email_eln_email?(mail_to)
      mail_to.casecmp(@mail_address).zero? ||
        (@aliases.any? { |s| s.casecmp(mail_to).zero? })
    end

    def from_email
      @from_email ||= envelope&.from&.first && format_email(envelope.from.first)
    end

    def receivers
      @receivers ||= fetch_receivers
    end

    def format_email(email_object)
      "#{email_object.mailbox}@#{email_object.host}"
    end

    def fetch_receivers
      list = envelope.to.presence || []
      list.concat(envelope.cc) if envelope.cc
      list.map { |email_obj| format_email(email_obj) }
          .reject { |m| email_eln_email?(m) }
    end

    def log_info(message)
      DCLogger.log.info(self.class.name) do
        " >>> #{message}"
      end
    end

    def log_error(message)
      DCLogger.log.error(self.class.name) do
        " >>> #{message}"
      end
    end
  end
end
