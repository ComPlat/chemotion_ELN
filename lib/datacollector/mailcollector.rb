# frozen_string_literal: true

require 'net/imap'
require 'mail'

module Datacollector
  # Class for collecting attachment data from emails
  class Mailcollector
    INBOX = 'INBOX'
    ENVELOPE = 'ENVELOPE'
    RFC822 = 'RFC822'

    attr_reader :config

    def initialize
      @config = MailConfiguration.new
      login
    end

    # Fetches all unseen emails and processes them
    #
    # @note The process is as follows:
    #   |__ Fetch all unseen emails
    #   |    |__For each email
    #   |         |__  `open_envelop`    : Open the ENVELOPE and set the instance variable @envelope
    #   |         |__  `correspondences` : set the array of Datacollector::Correspondence between sender and recipients
    #   |         |          |            based on the the email addresses extracted from the envelope (from, to, cc)
    #   |         |          |__ `sender_email`
    #   |         |          |__ `receivers_emails`
    #   |         |
    #   |         X--> skip to the next email if no correspondence is found
    #   |         |   (no ELN user found as recipient or the sender is not an ELN user/device)
    #   |         |
    #   |         |__ `handle_message` Extract and set the message
    #   |         |        |
    #   |         |        X--> return if message has no attachments
    #   |         |        |__  `handle_attachment` for each attachment in the message
    #   |         |                  |__  `correspondence.attach` create the attachment in the recipient ELN user inbox
    #   |         |
    #   |         |__ delete the email or mark the email as read
    #   |         |__ reset the correspondence array
    #   |
    #   |__ Logout
    #
    # @note if the sender is known but not the recipient, the email is currently marked as read
    #  as when the sender is not known
    def execute
      imap.search(%w[NOT SEEN]).each do |message_id|
        open_envelope(message_id)
        if correspondences.empty?
          imap.store(message_id, '+FLAGS', [:Seen])
          next
        end

        handle_message(message_id)
        imap.store(message_id, '+FLAGS', [:Deleted])
      ensure
        @correspondences = nil
      end
    rescue StandardError => e
      log.error __method__, e.backtrace.join('\n')
      raise
    ensure
      logout
    end

    private

    delegate :log, to: :config

    ############################################################################################################
    ## IMAP Connection
    ############################################################################################################

    delegate :server, :mail_address, :password, :aliases, :port, :ssl, to: :config

    # Imap login and navigate to inbox
    #  (initialize the imap instance variable)
    def login
      response = imap.login(mail_address, password)
      raise if response['name'] != 'OK'

      log.info('Login...')
      imap.select(INBOX)
    rescue StandardError => e
      log.error("Cannot login #{server}", e.message)
      logout
    end

    # Imap logout and disconnection
    def logout
      imap.close
      imap.logout
      imap.disconnect
    rescue StandardError => e
      log.error("Cannot logout #{server}", e.message)
    end

    # Set the IMAP instance
    # @todo: use new syntax (server, **options) as (server, port, ssl) is obsolete
    #  However login does not work with the new syntax. .authenticate should be used instead of .login
    # @return [Net::IMAP]
    def imap
      # @imap ||= Net::IMAP.new(server, port: port, ssl: ssl)
      @imap ||= Net::IMAP.new(server, port, ssl)
    end

    ############################################################################################################
    ## Building the Correspondence Array
    ############################################################################################################

    # Define the correspondence array between the ELN devices or users
    #   as extracted from the envelope (from, to, cc)
    #
    # @return [Array<Datacollector::Correspondence>] the correspondence array
    def correspondences
      @correspondences ||= CorrespondenceArray.new(sender_email, receiver_emails)
    rescue Errors::DatacollectorError => e
      log.error __method__, e.message

      []
    end

    # Check if the the given email address is the ELN system email address or one of the aliases
    #
    # @param mail_to [String] the email address to check
    # @return [Boolean] true if the email address is the ELN system email address or one of the aliases
    def email_eln_email?(mail_to)
      mail_to.casecmp(mail_address).zero? ||
        (aliases.any? { |s| s.casecmp(mail_to).zero? })
    end

    # The sender email address from the current envelope
    #
    # @return [String] the email address of the sender
    def sender_email
      @envelope&.from&.first && format_email(@envelope.from.first)
    end

    # Format the email address from the email object
    #
    # @param email_object [Mail::Address] the email Object
    # @return [String] the email address
    def format_email(email_object)
      "#{email_object.mailbox}@#{email_object.host}"
    end

    # Extract the email address of the receivers from the envelope
    # while omitting the ELN system email address
    #
    # @return [Array<String>] the email addresses of the receivers
    def receiver_emails
      (@envelope.to.presence || []).concat(@envelope.cc || [])
                                   .map { |email_obj| format_email(email_obj) }
                                   .reject { |email| email_eln_email?(email) }
    end

    ############################################################################################################
    ## Handling the Email
    ############################################################################################################

    # Set the envelope instance variable
    #
    # @param id [Integer] the id of the email to open
    # @return [Net::IMAP::Envelope] the envelope of the email
    def open_envelope(id)
      @envelope = nil
      @envelope = imap.fetch(id, ENVELOPE).first.attr[ENVELOPE]
    end

    # Fetch the raw message from the email id
    #
    # @param id [Integer] the id of the email to Fetch
    # @return [String] the raw message
    def raw_message(id)
      imap.fetch(id, RFC822).first.attr[RFC822]
    end

    # Build the message object from the raw message and handle the attachments
    #
    # @param id [Integer] the id of the email to handle
    def handle_message(id)
      message = Mail.read_from_string raw_message(id)
      return if message&.attachments.blank?

      log.info(message.from, message.subject)
      message.attachments.each { |attachment| handle_attachment(attachment, message.subject) }
    rescue StandardError => e
      log.error __method__, e.backtrace.join('\n')
    end

    # Attach the attachments of the email message to the receiver Inbox
    #
    #  @param attachment [Mail::Attachment] the attachment to handle
    def handle_attachment(attachment, subject)
      tempfile = Tempfile.new('mail_attachment')
      tempfile.binmode
      tempfile.write(attachment.decoded)
      tempfile.rewind
      correspondences.each do |correspondence|
        correspondence.attach(attachment.filename, tempfile.path, subject)
        log.info("Attached #{attachment.filename} to #{correspondence.recipient.id}")
        tempfile.rewind
      end
    rescue StandardError => e
      log.error __method__, e.message
      raise e
    ensure
      tempfile.close
      tempfile.unlink
    end
  end
end
