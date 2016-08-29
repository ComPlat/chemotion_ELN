# Use this file to easily define all of your cron jobs.
#
# It's helpful, but not entirely necessary to understand cron before proceeding.
# http://en.wikipedia.org/wiki/Cron

every 4.days do
  runner "ReallyDestroyTask.execute!"
end

every :sunday, at: '12pm' do
  command "backup perform -t weekly_backup -c backup/config.rb"
end
