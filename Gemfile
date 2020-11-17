source 'https://rubygems.org'

gem 'aasm'
gem 'activejob-status'
gem 'ancestry'
gem 'api-pagination'
gem 'axlsx', git: 'https://github.com/randym/axlsx'

gem 'backup'
gem 'barby'
gem 'bcrypt_pbkdf', '>= 1.0', '< 2.0'
gem 'bibtex-ruby'
gem 'bootstrap-sass', '~> 3.4.1'
gem 'browserify-rails', '~> 4.2.0'

gem 'closure_tree'
gem 'countries'

gem 'daemons'
gem 'delayed_cron_job'
gem 'delayed_job_active_record'
gem 'devise'
gem 'dotenv-rails', require: 'dotenv/rails-now'

gem 'ed25519', '>= 1.2', '< 2.0'

gem 'faraday', '~> 0.12.1'
gem 'faraday_middleware', '~> 0.12.1'
gem 'font-awesome-rails'
gem 'fun_sftp', git: 'https://github.com/fl9/fun_sftp.git', branch: 'allow-port-option'
gem 'fx'

gem 'gitlab-styles', require: false
gem 'grape', '~>1.2.3'
gem 'grape-active_model_serializers'
gem 'grape-entity'
gem 'grape-kaminari'
gem 'grape-swagger-entity', '~> 0.3'
gem 'grape-swagger-representable', '~> 0.2'
gem 'grape-swagger'
gem 'rack-cors', :require => 'rack/cors'
gem 'grape-swagger-rails'

gem 'haml-rails', '~> 1.0'
gem 'hashie-forbidden_attributes'
gem 'httparty'

gem 'jbuilder', '~> 2.0'
gem 'jquery-rails'
gem 'jwt'

gem 'kaminari'
gem 'kaminari-grape'
# gem 'ketcherails', '~> 0.1.7', git: 'https://github.com/ComPlat/ketcher-rails', ref: '5ba24d302ae1db2885be74e0784f876cba122800'

gem 'net-sftp'
gem 'net-ssh'
gem 'nokogiri'

gem 'openbabel', '2.4.90.3', git: 'https://github.com/ComPlat/openbabel-gem.git', branch: 'hot-fix-svg'

gem 'pandoc-ruby'
gem 'paranoia', '~> 2.0'
gem 'pg', '~> 0.20.0'
gem 'pg_search'
gem 'prawn'
gem 'prawn-svg'
gem 'pundit'

# If we want to upgrade past rack >= 2.1 we need to upgrade to at least grape
# 1.3.0
gem 'rack', '~> 2.0.0'
gem 'rails', '~> 5.0.0'
gem 'rdkit_chem', git: "https://github.com/CamAnNguyen/rdkit_chem"
gem 'rinchi-gem', '1.0.1', git: 'https://git.scc.kit.edu/ComPlat/rinchi-gem.git'
gem 'rmagick'
gem 'roo', '>2.5.0'
gem 'rqrcode'
gem 'rtf'
gem 'ruby-geometry', require: 'geometry'
gem 'ruby-mailchecker'
gem 'ruby-ole'

gem 'sablon', git: 'https://github.com/ComPlat/sablon'
gem 'sassc-rails', '~> 2.1.2'
gem 'scenic'
gem 'schmooze'
gem 'swot', git: 'https://github.com/leereilly/swot.git', branch: 'master', ref: 'bfe392b4cd52f62fbc1d83156020275719783dd1'
gem 'sys-filesystem'

gem 'thor'
gem 'thumbnailer', git: 'https://github.com/merlin-p/thumbnailer.git'
gem 'turbo-sprockets-rails4'

gem 'uglifier', '>= 4.0.0'

gem 'whenever', require: false

gem 'yaml_db'

group :development do
  gem 'better_errors' # allows to debug exception on backend from browser

  gem 'capistrano', '3.9.1'
  gem 'capistrano-bundler'
  gem 'capistrano-npm'
  gem 'capistrano-nvm', require: false
  gem 'capistrano-rails'
  gem 'capistrano-rvm'

  gem 'fast_stack'    # For Ruby MRI 2.0
  gem 'flamegraph'

  gem 'memory_profiler'

  gem 'rack-mini-profiler', git: 'https://github.com/MiniProfiler/rack-mini-profiler'
  gem 'rubocop'             , require: false
  gem 'rubocop-performance' , require: false
  gem 'rubocop-rspec'       , require: false

  gem 'slackistrano'
  gem 'stackprof'     # For Ruby MRI 2.1+

  gem 'web-console', '~> 2.0'
end

group :development, :test do
  gem 'annotate'
  gem 'awesome_print'

  gem 'binding_of_caller'
  gem 'bullet'
  gem 'byebug'

  gem 'chronic'

  # Install mailcatcher outside the bundle since it does not support rack 2.0
  # Use `gem install mailcatcher` instead
  # gem 'mailcatcher'
  gem 'meta_request'

  gem 'rspec-rails'
  gem 'rubyXL', '3.3.26'

  gem 'spring'

  gem 'thin'
end

group :test do
  gem 'capybara', '~> 3.29.0'

  gem 'database_cleaner'

  gem 'factory_bot_rails', '~>4.11'
  gem 'faker', '~> 1.6.6'

  gem 'headless', '2.0.0'

  gem 'launchy', '~> 2.4.3'

  gem 'rspec-repeat'

  gem 'webdrivers', '~> 4.1.2'
  gem 'webmock'
end

# Chemotion plugins: list your ELN specific plugin gems in the Gemfile.plugin
eln_plugin = File.join(File.dirname(__FILE__), "Gemfile.plugin")
if File.exists?(eln_plugin)
  eval_gemfile eln_plugin
end

