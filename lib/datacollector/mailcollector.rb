# frozen_string_literal: true

require 'net/imap'
require 'mail'

class Mailcollector
  def initialize
    raise 'No datacollector configuration!' unless Rails.configuration.datacollectors

    config = Rails.configuration.datacollectors.mailcollector
    @server = config[:server]
    @mail_address = config[:mail_address]
    @password = config[:password]
    @aliases = config[:aliases] || []
    @port = config.key?(:port) ? config[:port] : 993
    @ssl = config.key?(:ssl) ? config[:ssl] : true
  end

  def execute
    imap = Net::IMAP.new(@server, @port, @ssl)
    response = imap.login(@mail_address, @password)
    if response['name'] == 'OK'
      log_info('Login...')
      imap.select('INBOX')
      imap.search(%w[NOT SEEN]).each do |message_id|
        handle_new_mail(message_id, imap)
      rescue StandardError => e
        log_error e.message
      end
      imap.close
    else
      log_error("Cannot login #{@server}")
      raise
    end
  rescue StandardError => e
    log_error 'mail collector execute error:'
    log_error e.backtrace.join('\n')
    raise
  ensure
    imap.logout
    imap.disconnect
  end

  private

  def handle_new_mail(message_id, imap)
    envelope = imap.fetch(message_id, 'ENVELOPE')[0].attr['ENVELOPE']
    raw_message = imap.fetch(message_id, 'RFC822').first.attr['RFC822']
    message = Mail.read_from_string raw_message
    helper_set = create_helper_set(envelope)
    log_info "Mail from #{message.from}"
    unless helper_set
      log_info "#{message.from} Email format incorrect or sender unknown!"
      return nil
    end
    helper_set.helper_set.each do |helper|
      unless helper.sender
        log_info "#{message.from} Sender unknown!"
        return nil
      end
      unless helper.recipient
        log_info "#{message.from} Recipient unknown!"
        return nil
      end
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
    raise
  end

  def handle_new_message(message, helper)
    dataset = helper.prepare_new_dataset(message.subject)
    message.attachments.each do |attachment|
      tempfile = Tempfile.new('mail_attachment')
      tempfile.binmode
      tempfile.write(attachment.decoded)
      tempfile.rewind
      att = Attachment.new(
        filename: attachment.filename,
        created_by: helper.sender.id,
        created_for: helper.recipient.id,
        file_path: tempfile.path,
      )

      att.save!
      tempfile.close
      tempfile.unlink
      att.update!(attachable: dataset)
    end
  rescue StandardError => e
    log_error 'Error on mailcollector handle_new_message:'
    log_error e.backtrace.join('\n')
    raise
  end

  def is_email_eln_email?(mail_to)
    mail_to.casecmp(@mail_address).zero? ||
      (@aliases.any? { |s| s.casecmp(mail_to).zero? })
  end

  def get_user(mail)
    user = User.find_by email: mail
    user ||= User.find_by email: mail.downcase
    user
  end

  def create_helper_set(envelope)
    helper = nil
    begin
      # Check if from is User or Device
      from = "#{envelope.from[0].mailbox}@#{envelope.from[0].host}"
      from_user = get_user from
      raise "#{from} not registered" if from_user.nil?

      receiver = []
      if from_user.is_a?(User) && (!from_user.is_a?(Device) && !from_user.is_a?(Admin))
        receiver.push(from_user)
      else # Concatenate all receiver (cc & to)
        receiver.concat(envelope.cc) if envelope.cc
        receiver.concat(envelope.to) if envelope.to
        receiver = receiver.map { |m| "#{m.mailbox}@#{m.host}" }
        receiver = receiver.reject { |m| is_email_eln_email?(m) }
        receiver = receiver.map do |m|
                     get_user m
                   end.select { |user| !user.nil? && !user.is_a?(Device) && !user.is_a?(Admin) }
      end
      unless receiver.length.zero?
        helper = CollectorHelperSet.new(
          from_user,
          receiver,
        )
      end
    rescue StandardError => e
      log_error 'Error on mailcollector create_helper:'
      log_error e.backtrace.join('\n')
      raise
    end
    helper
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
