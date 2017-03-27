require 'mail'
require 'openssl'
require SecureRandom

class Mailcollector < Collector

  def initialize(method, address, port, user, passwd)
    Mail.defaults do
      retriever_method :pop3,
      :address => address,
      :port => port,
      :user_name => user,
      :password => passwd,
      :enable_ssl => true
    end
  end

  def execute

    mails = Mail.all
    mails.each do |mail|

      handle_new_mail(mail)

    end
  end

private
  def handle_new_mail(mail)

    sender = User.find_by email: ""
    recipient = User.find_by email: "test@test.de"
    attached_file = nil

    if check_sender(sender)
      if recipient != nil
        sha256 = Digest::SHA256.file(attached_file).hexdigest

        storage = Storage.new
        storage.create(SecureRandom.uuid, "filename", IO.binread(attached_file), sha256, sender.id, recipient.id)
      else
        #User not found
      end
    end
  end

  def check_sender(sender)
    true
  end

end
