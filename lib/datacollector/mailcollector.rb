require 'net/imap'
require 'mail'

class Mailcollector < Collector

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
        puts "Logged in"
        imap.select('INBOX')

        imap.search(['NOT', 'SEEN']).each do |message_id|
          puts "Message found " + message_id.to_s

          envelope = imap.fetch(message_id, "ENVELOPE")[0].attr["ENVELOPE"]
          puts "Sender Mailbox: " + envelope.from[0].mailbox.to_s
          puts "Sender Host: " + envelope.from[0].host.to_s

          sender_email = envelope.from[0].mailbox.to_s + "@" + envelope.from[0].host.to_s
          recipient_email = envelope.to[0].mailbox + "@" + envelope.to[0].host

          sender = Device.find_by email: sender_email
          recipient = User.find_by email: recipient_email
          if sender && recipient
            puts "Sender and recipient found"
            puts "Starting...."

            raw_message = imap.fetch(message_id, 'RFC822').first.attr['RFC822']
            message = Mail.read_from_string raw_message
            handle_new_mail(sender, recipient, message)
          end
          imap.store(message_id, "+FLAGS", [:Deleted])
        end
        imap.close
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
          uuid = SecureRandom.uuid
          storage.create(uuid, attachment.filename, attachment.body.decoded, sha256, sender.id, recipient.id)
          storage.update(uuid, nil)
        end
      end

    rescue Exception => e
      puts "ERROR: Cannot handle mail " + e.message
      raise e.message
    end

  end

end
