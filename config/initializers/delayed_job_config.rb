# Delayed::Worker.destroy_failed_jobs = false
# Delayed::Worker.sleep_delay = 60
# Delayed::Worker.max_attempts = 3
# Delayed::Worker.max_run_time = 5.minutes
# Delayed::Worker.read_ahead = 10
# Delayed::Worker.default_queue_name = 'default'
# Delayed::Worker.delay_jobs = !Rails.env.test?
# Delayed::Worker.raise_signal_exceptions = :term
Delayed::Worker.logger = Logger.new(File.join(Rails.root, 'log', 'delayed_job.log'))

begin
  if ActiveRecord::Base.connection.table_exists?('delayed_jobs') && Delayed::Job.column_names.include?('cron')
    Delayed::Job.where("handler like ?", "%CollectDataFrom%").destroy_all
    Delayed::Job.where("handler like ?", "%CollectFileFrom%").destroy_all
    if Rails.configuration.datacollectors && Rails.configuration.datacollectors.services
      for service in Rails.configuration.datacollectors.services do
        cron_config = nil
        config = service[:every].to_s.strip
        cron_config = '*/' + config + ' * * * *' if config.split(/\s/).size == 1
        config = service[:cron].to_s.strip
        cron_config = config if config.split(/\s/).size == 5
        case service[:name].to_s
        when 'mailcollector'
          CollectDataFromMailJob
        when 'folderwatchersftp'
          CollectDataFromSftpJob
        when 'folderwatcherlocal'
          CollectDataFromLocalJob
        when 'filewatcherlocal'
          CollectFileFromLocalJob
        when 'filewatchersftp'
          CollectFileFromSftpJob
        else
          nil
        end&.set(cron: cron_config).perform_later if cron_config
      end
    end
    Delayed::Job.where("handler like ?", "%PubchemCidJob%").destroy_all
    cron_config = ENV['CRON_CONFIG_PC_CID'].presence
    cron_config ||= "#{rand(0..59)} #{rand(0..23)} * * #{rand(6..7)}"
    PubchemCidJob.set(cron: cron_config ).perform_later
    Delayed::Job.where("handler like ?", "%PubchemLcssJob%").destroy_all
    cron_config = ENV['CRON_CONFIG_PC_LCSS'].presence
    cron_config ||= "#{rand(0..59)} #{rand(0..23)} * * #{rand(6..7)}"
    PubchemLcssJob.set(cron: cron_config).perform_later
    Delayed::Job.where("handler like ?", "%RefreshElementTagJob%").destroy_all
    cron_config = ENV['CRON_CONFIG_ELEMENT_TAG'].presence
    cron_config ||= "#{rand(0..59)} #{rand(20..23)} * * #{rand(6..7)}"
    RefreshElementTagJob.set(cron: cron_config ).perform_later
    Delayed::Job.where("handler like ?", "%ChemrepoIdJob%").destroy_all
    cron_config = ENV['CRON_CONFIG_CHEM_REPO_ID'].presence
    cron_config ||= "#{rand(0..59)} #{rand(17..19)} * * #{rand(6..7)}"
    ChemrepoIdJob.set(cron: cron_config ).perform_later

  end
rescue PG::ConnectionBad => e
  puts e.message
end
