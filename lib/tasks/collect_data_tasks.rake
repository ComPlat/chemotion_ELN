task collect_mail_data: :environment do
  collector = Mailcollector.new
  collector.execute
end
