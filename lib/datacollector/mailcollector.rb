require 'net/imap'
require 'mail'

class Mailcollector < Collector

  def initialize
    @server = Rails.configuration.datamailcollector.server
    @port = Rails.configuration.datamailcollector.port
    @ssl = Rails.configuration.datamailcollector.ssl
    @mail_address = Rails.configuration.datamailcollector.mail_address
    @password = Rails.configuration.datamailcollector.password

    @sender_mailbox = Rails.configuration.datamailcollector.sender_mailbox
    @sender_host = Rails.configuration.datamailcollector.sender_host
  end

  def execute

    begin
      imap = Net::IMAP.new(@server, @port, @ssl)
      response = imap.login(@mail_address, @password)
      if response['name'] == "OK"
        puts "Logged in"
        imap.select('INBOX')
        imap.search(['NOT', 'SEEN']).each do |message_id|
          puts "Message found " + message_id.to_s

          envelope = imap.fetch(message_id, "ENVELOPE")[0].attr["ENVELOPE"]
          puts "Sender Mailbox: " + envelope.from[0].mailbox.to_s
          puts "Sender Host: " + envelope.from[0].host.to_s
          if envelope.from[0].mailbox.to_s == @sender_mailbox &&
            envelope.from[0].host.to_s == @sender_host
            puts "Sender found"

            sender_email = @sender_mailbox + "@" + @sender_host
            sender = Device.find_by email: sender_email

            #recipient_email = envelope.cc[0].mailbox + "@" + envelope.cc[0].host
            recipient_email = envelope.to[0].mailbox + "@" + envelope.to[0].host
            recipient = User.find_by email: recipient_email
            if sender && recipient
              puts "Starting...."
              raw_message = imap.fetch(message_id, 'RFC822').first.attr['RFC822']
              message = Mail.read_from_string raw_message
              handle_new_mail(sender, recipient, message)
              imap.store(message_id, "+FLAGS", [:Seen])
            else
              imap.store(message_id, "+FLAGS", [:Seen])
            end
          else
            imap.store(message_id, "+FLAGS", [:Seen])
          end
        end
      else
        puts "ERROR: Cannot login " + @server
        raise
      end
    rescue Exception => e
      puts "ERROR: Cannot handle new data mails " + e.message
      raise e.message
    ensure
      imap.logout
      imap.disconnect
    end

  end

private
  def handle_new_mail(sender, recipient, message)
    begin
      if message.multipart?
        storage = Storage.new
        puts "Attachments " + message.attachments.length.to_s
        message.attachments.each do |attachment|
          sha256 = Digest::SHA256.hexdigest attachment.body.decoded
          storage.create(SecureRandom.uuid, attachment.filename, attachment.body.decoded, sha256, sender.id, recipient.id)
        end
      end

    rescue Exception => e
      puts "ERROR: Cannot handle mail " + e.message
      raise e.message
    end

  end

end
