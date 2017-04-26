namespace :backup do
  task weekly: :environment do
    sh "backup perform -t weekly_backup -c backup/config.rb >> backup/backup_cron.log"
  end
end
