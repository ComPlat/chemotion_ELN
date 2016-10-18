lock '3.4.1'

set :application, 'chemotion'
set :repo_url, 'git@github.com:ComPlat/chemotion_ELN.git'

# Default branch is :master
ask :branch, `git rev-parse --abbrev-ref HEAD`.chomp

set :deploy_to, '/home/deploy/www/chemotion'

set :rails_env,   "production"
set :unicorn_env, "production"
set :unicorn_rack_env, "production"
set :whenever_identifier, ->{ "#{fetch(:application)}_#{fetch(:stage)}" }
set :nvm_node, 'v4.4.7'

# Default value for :format is :pretty
# set :format, :pretty

# Default value for :log_level is :debug
# set :log_level, :debug

# Default value for :pty is false
# set :pty, true

# Default value for :linked_files is []
set :linked_files, fetch(:linked_files, []).push('config/database.yml', 'config/secrets.yml', '.env')

# Default value for linked_dirs is []
set :linked_dirs, fetch(:linked_dirs, []).push('node_modules','log', 'tmp/pids',
'tmp/cache', 'tmp/sockets', 'public/images', 'uploads/attachments',
'uploads/thumbnails', 'backup/deploy_backup', 'backup/weekly_backup')

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for keep_releases is 5
# set :keep_releases, 5

before 'deploy:migrate', 'deploy:backup'
after 'deploy:publishing', 'deploy:restart'

namespace :deploy do

  task :backup do
    on roles :app do
      within "#{fetch(:deploy_to)}/current/" do
        with RAILS_ENV: fetch(:rails_env) do
          execute :bundle, 'exec backup perform -t deploy_backup -c backup/config.rb'
        end
      end
    end

    # RSync local folder with server backups
    backup_dir = "#{fetch(:user)}@#{fetch(:server)}:#{fetch(:deploy_to)}/shared/backup"
    puts backup_dir
    system("rsync -r #{backup_dir}/deploy_backup backup")
  end

  task :restart do
    on roles :app do
      execute :touch, "#{current_path}/tmp/restart.txt"
    end
  end

  after :restart, :clear_cache do
    on roles :app do
      # Here we can do anything such as:
       within release_path do
         execute :rake, 'tmp:cache:clear'
      end
    end
  end

end
