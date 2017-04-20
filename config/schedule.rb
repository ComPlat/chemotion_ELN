# Use this file to easily define all of your cron jobs.
#
# It's helpful, but not entirely necessary to understand cron before proceeding.
# http://en.wikipedia.org/wiki/Cron

every :sunday, at: '0am' do
  rake "backup:weekly"
end

every :sunday, at: '1am' do
  runner "ReallyDestroyTask.execute!"
end
