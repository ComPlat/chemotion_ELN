require 'net/imap'
require 'mail'

class Mailcollector

  def initialize
    @server = Rails.configuration.datamailcollector.server
    @port = Rails.configuration.datamailcollector.port
    @ssl = Rails.configuration.datamailcollector.ssl
    @mail_address = Rails.configuration.datamailcollector.mail_address
    @password = Rails.configuration.datamailcollector.password
  end

  def execute
    begin
      imap = Net::IMAP.new(@server, @port, @ssl)
      response = imap.login(@mail_address, @password)
      if response['name'] == "OK"
        puts "Logged in....."
        imap.select('INBOX')
        imap.search(['NOT', 'SEEN']).each do |message_id|
          puts "Handle new mail " + message_id.to_s
          begin
            handle_new_mail(message_id, imap)
            imap.store(message_id, "+FLAGS", [:Deleted])
          rescue
            puts "Cannot handle new mail ID: " + message_id.to_s
          end
        end
        imap.close
      else
        puts "ERROR: Cannot login " + @server
        raise
      end
    ensure
      imap.logout
      imap.disconnect
    end
  end

private
  def handle_new_mail(message_id, imap)
    envelope = imap.fetch(message_id, "ENVELOPE")[0].attr["ENVELOPE"]
    helper = getHelper(envelope)
    if helper && helper.sender_recipient_known?
      raw_message = imap.fetch(message_id, 'RFC822').first.attr['RFC822']
      message = Mail.read_from_string raw_message
      if message.multipart?
        puts "Handle new message..."
        handle_new_message(message, helper)
      end
    end
  end

  def handle_new_message(message, helper)
    dataset = helper.prepare_dataset(message.subject)
    message.attachments.each do |attachment|
      puts "Store attachment..."
      a = Attachment.new(
        filename: attachment.filename,
        file_data: attachment.decoded,
        created_by: helper.sender.id,
        created_for: helper.recipient.id,
        content_type: attachment.mime_type
      )
      a.save!
      a.update!(container_id: dataset.id)
      primary_store = Rails.configuration.storage.primary_store
      a.update!(storage: primary_store)
    end
  end

  def getHelper(envelope)
    helper = nil
    if (envelope.cc && envelope.cc.length == 1) && (envelope.to && envelope.to.length == 1)
      puts "CC method"
      if envelope.to[0].mailbox.to_s + "@" + envelope.to[0].host.to_s == @mail_address
        helper = CollectorHelper.new(envelope.from[0].mailbox.to_s + "@" + envelope.from[0].host.to_s, envelope.cc[0].mailbox.to_s + "@" + envelope.cc[0].host.to_s)
      end
    elsif !envelope.cc && envelope.to && envelope.to.length == 2
      puts "To method"
      if envelope.to[0].mailbox.to_s + "@" + envelope.to[0].host.to_s == @mail_address
        helper = CollectorHelper.new(envelope.from[0].mailbox.to_s + "@" + envelope.from[0].host.to_s,
          envelope.to[1].mailbox.to_s + "@" + envelope.to[1].host.to_s)
      elsif envelope.to[1].mailbox.to_s + "@" + envelope.to[1].host.to_s == @mail_address
        helper = CollectorHelper.new(envelope.from[0].mailbox.to_s + "@" + envelope.from[0].host.to_s,
          envelope.to[0].mailbox.to_s + "@" + envelope.to[0].host.to_s)
      end
    elsif !envelope.cc && envelope.to && envelope.to.length == 1
      puts "Sender = Recipient method"
      if envelope.to[0].mailbox.to_s + "@" + envelope.to[0].host.to_s == @mail_address
        helper = CollectorHelper.new(envelope.from[0].mailbox.to_s + "@" + envelope.from[0].host.to_s)
      end
    end
    helper
  end
end
