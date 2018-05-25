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
    PubchemCidJob.set(cron: '15 1 * * 0').perform_later
  end
rescue PG::ConnectionBad => e
  puts e.message
end
