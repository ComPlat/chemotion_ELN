source 'https://rubygems.org'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '4.2.11.3'

gem 'thor', '0.19.1'

gem 'haml-rails', '~> 1.0'
# Use SCSS for stylesheets
gem 'sassc-rails', '~> 2.1.2'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 4.0.0'

gem 'turbo-sprockets-rails4'

# Twitter bootstrap styles
gem 'bootstrap-sass', '~> 3.4.1'
# Use jquery as the JavaScript library
gem 'jquery-rails'
# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
# gem 'turbolinks'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.0'
# bundle exec rake doc:rails generates the API under doc/api.

gem 'schmooze'

gem 'sys-filesystem'

gem 'rinchi-gem', '1.0.1', git: 'https://git.scc.kit.edu/ComPlat/rinchi-gem.git'

gem 'bibtex-ruby'
# gem 'bolognese'

# state machine
gem 'aasm'

group :development do
  # gem 'sdoc', '~> 1.1.0', group: :doc

  gem 'rack-mini-profiler', git: 'https://github.com/MiniProfiler/rack-mini-profiler'

  gem 'better_errors' # allows to debug exception on backend from browser
  # For memory profiling (requires Ruby MRI 2.1+)
  gem 'memory_profiler'

  # For call-stack profiling flamegraphs (requires Ruby MRI 2.0.0+)
  gem 'fast_stack'    # For Ruby MRI 2.0
  gem 'flamegraph'
  gem 'stackprof'     # For Ruby MRI 2.1+
  gem 'web-console', '~> 2.0'
  # gem 'immigrant'
  # gem 'brakeman'
end

gem 'pg', '~> 0.20.0'
gem 'pg_search'
gem 'fx'
gem 'scenic'

gem 'devise'
gem 'jwt'

gem 'dotenv-rails', require: 'dotenv/rails-now'

gem 'browserify-rails', '~> 4.2.0'

# for collection tree structure
gem 'ancestry'
gem 'closure_tree'

gem 'net-sftp'
gem 'net-ssh'
gem 'ed25519', '>= 1.2', '< 2.0'
gem 'bcrypt_pbkdf', '>= 1.0', '< 2.0'
# svg composer
gem 'nokogiri'

# SFTP client
gem 'fun_sftp', git: 'https://github.com/fl9/fun_sftp.git',
                branch: 'allow-port-option'

# API
gem 'grape', '~>1.2.3'
gem 'grape-active_model_serializers'
gem 'grape-kaminari'
gem 'grape-entity'
gem 'hashie-forbidden_attributes'
gem 'kaminari'
gem 'kaminari-grape'
gem 'grape-swagger-entity', '~> 0.3'
gem 'grape-swagger-representable', '~> 0.2'
gem 'grape-swagger'
gem 'rack-cors', :require => 'rack/cors'
gem 'grape-swagger-rails'

gem "rdkit_chem", git: "https://github.com/CamAnNguyen/rdkit_chem"

gem 'api-pagination'

gem 'pundit'

# Report Generator
gem 'axlsx', git: 'https://github.com/randym/axlsx'
gem 'rmagick'
gem 'rtf'
gem 'sablon', git: 'https://github.com/ComPlat/sablon'

# Import of elements from XLS and CSV file
gem 'roo', '>2.5.0'

# export reseearch plan
gem 'pandoc-ruby'

gem 'faraday', '~> 0.12.1'
gem 'faraday_middleware', '~> 0.12.1'
gem 'httparty'

gem 'ketcherails', '~> 0.1.7', git: 'https://github.com/ComPlat/ketcher-rails', ref: '5ba24d302ae1db2885be74e0784f876cba122800'
# gem  'ketcherails', path: '../ketcher-rails'

# Free font icons
gem 'font-awesome-rails'

# delayed job
gem 'delayed_job_active_record'
gem 'delayed_cron_job'

# required by cap3 delayed-job but has to be specified manually
gem 'daemons'

# dataset previews
gem 'thumbnailer', git: 'https://github.com/merlin-p/thumbnailer.git'

# data integrity
gem 'paranoia', '~> 2.0'

gem 'backup'
gem 'whenever', require: false

gem 'rubocop', require: false
gem 'rubocop-performance', require: false
gem 'rubocop-rspec', require: false
gem 'gitlab-styles', require: false

gem 'yaml_db'

gem 'ruby-ole'
gem 'ruby-geometry', require: 'geometry'

# CI
# gem 'coveralls', require: false

# openbabel
# to compile from github/openbabel/openbabel master
# gem 'openbabel', '2.4.1.2', git: 'https://github.com/ComPlat/openbabel-gem'
# to compile from github/openbabel/openbabel branch openbabel-2-4-x
gem 'openbabel', '2.4.90.3', git: 'https://github.com/ComPlat/openbabel-gem.git', branch: 'hot-fix-svg'

gem 'barby'
gem 'prawn'
gem 'prawn-svg'
gem 'rqrcode'

gem 'countries'
gem 'ruby-mailchecker'
gem 'swot', git: 'https://github.com/leereilly/swot.git', branch: 'master',
            ref: 'bfe392b4cd52f62fbc1d83156020275719783dd1'
# gem 'gman', '~> 7.0.3'
gem 'activejob-status'

group :development, :test do
  gem 'binding_of_caller'

  gem 'annotate'

  gem 'mailcatcher', '0.7.1'

  # Call 'byebug' anywhere in the code to stop execution
  # and get a debugger console
  gem 'byebug'

  # Access an IRB console on exception pages or by using <%= console %> in views

  gem 'bullet'

  # Spring speeds up development by keeping your application
  # running in the background. Read more: https://github.com/rails/spring
  gem 'spring'

  # Testing
  gem 'rspec-rails'

  # Use thin as dev webserver
  gem 'thin'

  # generate icon fonts
  # gem 'fontcustom'

  # nice debug print
  gem 'awesome_print'

  # RailsPanel Chrome extension
  gem 'meta_request'

  gem 'capistrano', '3.9.1'
  gem 'capistrano-bundler'
  gem 'capistrano-npm'
  gem 'capistrano-nvm', require: false
  gem 'capistrano-rails'
  gem 'capistrano-rvm'
  # gem 'capistrano3-delayed-job'
  gem 'slackistrano'
  gem 'rubyXL', '3.3.26'
  gem 'chronic'
end

group :test do
  gem 'database_cleaner'
  gem 'factory_bot_rails', '~>4.11'

  gem 'capybara', '~> 3.29.0'
  gem 'webdrivers', '~> 4.1.2'
  gem 'faker', '~> 1.6.6'
  gem 'headless', '2.0.0'
  gem 'launchy', '~> 2.4.3'
  # gem 'selenium-webdriver', '~> 3.14.0'
  gem 'webmock'
  gem 'rspec-repeat'
end

gem 'nmr_sim', git: 'https://github.com/ComPlat/nmr_sim', ref: 'e2f91776aafd8eb1fa9d88c8ec2291b02201f222', group: [:plugins,:development, :test, :production]

# Chemotion plugins: list your ELN specific plugin gems in the Gemfile.plugin
eln_plugin = File.join(File.dirname(__FILE__), "Gemfile.plugin")
if File.exists?(eln_plugin)
  eval_gemfile eln_plugin
end

####
