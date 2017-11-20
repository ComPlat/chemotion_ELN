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
        case service[:name].to_s
        when 'mailcollector'
          CollectDataFromMailJob.set(cron: '*/' + service[:every].to_s + ' * * * *').perform_later
        when 'folderwatchersftp'
          CollectDataFromSftpJob.set(cron: '*/' + service[:every].to_s + ' * * * *').perform_later
        when 'folderwatcherlocal'
          CollectDataFromLocalJob.set(cron: '*/' + service[:every].to_s + ' * * * *').perform_later
        when 'filewatcherlocal'
          CollectFileFromLocalJob.set(cron: '*/' + service[:every].to_s + ' * * * *').perform_later
        when 'filewatchersftp'
          CollectFileFromSftpJob.set(cron: '*/' + service[:every].to_s + ' * * * *').perform_later
        end
      end
    end
  end
rescue PG::ConnectionBad => e
  puts e.message
end
