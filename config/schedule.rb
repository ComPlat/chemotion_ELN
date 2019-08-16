# Use this file to easily define all of your cron jobs.
#
# It's helpful, but not entirely necessary to understand cron before proceeding.
# http://en.wikipedia.org/wiki/Cron
job_type :bin,  "cd :path && :environment_variable=:environment bundle exec bin/:task :args :action :output"

every :sunday, at: '0am' do
  rake "backup:weekly"
end

# every '59 */12 * * *' do
#   bin "delayed_job", args: "--pool=collect_data --pool=* ", action: "restart"
# end

every :sunday, at: '1am' do
  # runner "ReallyDestroyTask.execute!"
end
