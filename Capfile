# Load DSL and set up stages
require 'capistrano/setup'

# Include default deployment tasks
require 'capistrano/deploy'
require "capistrano/scm/git"
install_plugin Capistrano::SCM::Git
require 'capistrano/rvm' # Ruby version manager
require 'capistrano/nvm' # Node version manager
require 'capistrano/npm' # Node package manager
require 'capistrano/bundler'
require 'capistrano/rails/migrations'
require 'capistrano/rails/assets'
#require 'capistrano/delayed_job'
require 'whenever/capistrano'
require 'slackistrano/capistrano'
require_relative 'lib/slackistrano_custom_messaging'
# Load custom tasks from `lib/capistrano/tasks` if you have any defined
Dir.glob('lib/capistrano/tasks/*.rake').each { |r| import r }
