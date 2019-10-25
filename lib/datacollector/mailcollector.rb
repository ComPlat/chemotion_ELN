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
      imap.search(['NOT', 'SEEN']).each do |message_id|
        handle_new_mail(message_id, imap)
      end
      imap.close
    else
      log_error('Cannot login ' + @server)
      raise
    end
  rescue => e
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
    helper = create_helper(envelope)
    log_info 'Mail from ' + message.from.to_s
    unless helper
      log_info message.from.to_s + ' Email format incorrect or sender unknown!'
      return nil
    end
    unless helper.sender
      log_info message.from.to_s + ' Sender unknown!'
      return nil
    end
    unless helper.recipient
      log_info message.from.to_s + ' Recipient unknown!'
      return nil
    end
    if message.attachments
      handle_new_message(message, helper)
      log_info message.from.to_s + ' Data stored!'
    else
      log_info message.from.to_s + ' No data!'
    end
    imap.store(message_id, '+FLAGS', [:Deleted])
    log_info message.from.to_s + ' Email processed!'
  rescue => e
    log_error 'Error on mailcollector handle_new_mail'
    log_error e.backtrace.join('\n')
    raise
  end

  def handle_new_message(message, helper)
    begin
      dataset = helper.prepare_new_dataset(message.subject)
      message.attachments.each do |attachment|
        a = Attachment.new(
          filename: attachment.filename,
          file_data: attachment.decoded,
          created_by: helper.sender.id,
          created_for: helper.recipient.id,
          content_type: attachment.mime_type
          )
        a.save!
        a.update!(attachable: dataset)
        primary_store = Rails.configuration.storage.primary_store
        a.update!(storage: primary_store)
      end
    rescue => e
      log_error 'Error on mailcollector handle_new_message:'
      log_error e.backtrace.join('\n')
      raise
    end
  end

  def create_helper(envelope)
    helper = nil
    begin
      if (envelope.cc && envelope.cc.length == 1) && (envelope.to && envelope.to.length == 1)
        log_info 'Using CC method...'
        mail_to = envelope.to[0].mailbox.to_s + '@' + envelope.to[0].host.to_s
        if mail_to.casecmp(@mail_address).zero? ||
           (@aliases.any? { |s| s.casecmp(mail_to).zero? })
          helper = CollectorHelper.new(
            envelope.from[0].mailbox.to_s + '@' + envelope.from[0].host.to_s,
            envelope.cc[0].mailbox.to_s + '@' + envelope.cc[0].host.to_s
          )
        end
      elsif !envelope.cc && envelope.to && envelope.to.length == 2
        log_info 'Using To method...'
        mail_to_first = envelope.to[0].mailbox.to_s + '@' + envelope.to[0].host.to_s
        mail_to_second = envelope.to[1].mailbox.to_s + '@' + envelope.to[1].host.to_s
        if  mail_to_first.casecmp(@mail_address).zero? ||
            (@aliases.any? { |s| s.casecmp(mail_to_first).zero? })
          helper = CollectorHelper.new(
            envelope.from[0].mailbox.to_s + '@' + envelope.from[0].host.to_s,
            mail_to_second
          )
        elsif mail_to_second.casecmp(@mail_address).zero? ||
              (@aliases.any? { |s| s.casecmp(mail_to_second).zero? })
          helper = CollectorHelper.new(
            envelope.from[0].mailbox.to_s + '@' + envelope.from[0].host.to_s,
            mail_to_first
          )
        end
      elsif !envelope.cc && envelope.to && envelope.to.length == 1
        log_info 'Using Sender = Recipient method...'
        mail_to = envelope.to[0].mailbox.to_s + '@' + envelope.to[0].host.to_s
        if mail_to.casecmp(@mail_address).zero? || (@aliases.any? { |s| s.casecmp(mail_to).zero? })
          helper = CollectorHelper.new(
            envelope.from[0].mailbox.to_s + '@' + envelope.from[0].host.to_s
          )
        end
      end
    rescue => e
      log_error 'Error on mailcollector create_helper:'
      log_error e.backtrace.join('\n')
      raise
    end
    helper
  end

  def log_info(message)
    DCLogger.log.info(self.class.name) {
      ' >>> ' + message
    }
  end

  def log_error(message)
    DCLogger.log.error(self.class.name) {
      ' >>> ' + message
    }
  end
end
