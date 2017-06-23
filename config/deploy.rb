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
set :bundle_jobs, 4 # parallel bundler

set :nvm_type, :user
set :nvm_node, 'v6.2.2'
set :nvm_map_bins, fetch(:nvm_map_bins, []).push('rake')

# Default value for :format is :pretty
# set :format, :pretty

# Default value for :log_level is :debug
# set :log_level, :debug

# Default value for :pty is false
# set :pty, true

# Default value for :linked_files is []
set :linked_files, fetch(:linked_files, []).push('config/database.yml', 'config/storage.yml', 'config/datamailcollector.yml', 'config/secrets.yml', '.env')

# Default value for linked_dirs is []
set :linked_dirs, fetch(:linked_dirs, []).push(
  'backup/deploy_backup', 'backup/weekly_backup',
  'node_modules',
  'log', 
  'public/images', 'public/docx', 'public/simulations',
  'tmp/pids', 'tmp/cache', 'tmp/sockets', 'tmp/uploads',
  'uploads', 'uploadNew'
)

set :rvm_ruby_version, (`cat .ruby-version`).strip

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for keep_releases is 5
# set :keep_releases, 5

before 'deploy:migrate', 'deploy:backup'
after 'deploy:publishing', 'deploy:restart'


namespace :git do
  task :update_repo_url do
    on roles(:all) do
      within repo_path do
        execute :git, 'remote', 'set-url', 'origin', fetch(:repo_url)
      end
    end
  end
end

namespace :deploy do

  task :backup do
    server_name = ""
    on roles :app do |server|
      server_name = server.hostname
      within "#{fetch(:deploy_to)}/current/" do
        with RAILS_ENV: fetch(:rails_env) do
          execute :bundle, 'exec backup perform -t deploy_backup -c backup/config.rb'
        end
      end
    end

    # RSync local folder with server backups
    backup_dir = "#{fetch(:user)}@#{server_name}:#{fetch(:deploy_to)}/shared/backup"
    unless system("rsync -r #{backup_dir}/deploy_backup backup")
      raise 'Error while sync backup folder'
    end
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

  task :restart do
    on roles :app do
      invoke 'delayed_job:restart'
    end
  end
end

namespace :delayed_job do
  def args
    fetch(:delayed_job_args, "")
  end

  def delayed_job_roles
    fetch(:delayed_job_server_role, :app)
  end

  desc 'Stop the delayed_job process'
  task :stop do
    on roles(delayed_job_roles) do
      within release_path do
        with rails_env: fetch(:rails_env) do
          execute :bundle, :exec, :'bin/delayed_job', :stop
        end
      end
    end
  end

  desc 'Start the delayed_job process'
  task :start do
    on roles(delayed_job_roles) do
      within release_path do
        with rails_env: fetch(:rails_env) do
          execute :bundle, :exec, :'bin/delayed_job', args, :start
        end
      end
    end
  end

  desc 'Restart the delayed_job process'
  task :restart do
    on roles(delayed_job_roles) do
      within release_path do
        with rails_env: fetch(:rails_env) do
          execute :bundle, :exec, :'bin/delayed_job', args, :restart
        end
      end
    end
  end
end
