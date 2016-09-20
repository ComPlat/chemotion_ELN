require 'mail'
require 'openssl'

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
        puts mail.from[0]
    end
  end

end
