# Use this file to easily define all of your cron jobs.
#
# It's helpful, but not entirely necessary to understand cron before proceeding.
# http://en.wikipedia.org/wiki/Cron

every :sunday, at: '0am' do
  rake "backup:weekly"
  runner "ReallyDestroyTask.execute!"
end

every 2.minutes do
  rake 'collect_mail_data'
end
