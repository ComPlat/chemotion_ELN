source 'https://rubygems.org'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '4.2.0'

gem "haml-rails", "~> 0.9"
# Use SCSS for stylesheets
gem 'sass-rails', '~> 5.0'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'
# Twitter bootstrap styles
gem 'bootstrap-sass', '~> 3.3.5'
# Use jquery as the JavaScript library
gem 'jquery-rails'
# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
#gem 'turbolinks'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.0'
# bundle exec rake doc:rails generates the API under doc/api.
gem 'sdoc', '~> 0.4.0', group: :doc

group :development do
  gem 'rack-mini-profiler'

  # For memory profiling (requires Ruby MRI 2.1+)
  gem 'memory_profiler'

  # For call-stack profiling flamegraphs (requires Ruby MRI 2.0.0+)
  gem 'flamegraph'
  gem 'stackprof'     # For Ruby MRI 2.1+
  gem 'fast_stack'    # For Ruby MRI 2.0
end

gem 'pg'
gem 'pg_search'

gem 'devise'

gem 'dotenv-rails', require: 'dotenv/rails-now'

gem 'browserify-rails' , '~> 3.0.1'

# for collection tree structure
gem 'ancestry'
gem 'closure_tree'

gem 'net-ssh'
gem 'net-sftp'

# svg composer
gem 'nokogiri'

# SFTP client
gem 'fun_sftp', git: 'https://github.com/fl9/fun_sftp.git', branch: 'allow-port-option'

# API
gem 'grape'
gem 'hashie-forbidden_attributes'
gem 'grape-active_model_serializers'
gem 'kaminari'
gem 'grape-kaminari'

gem 'pundit'

gem 'awesome_print'

# Report Generator
gem 'rtf'
gem 'sablon', git: 'https://github.com/ComPlat/sablon'
gem 'rmagick'
gem 'axlsx', git: 'https://github.com/randym/axlsx'
# Import of elements from XLS and CSV file
gem 'roo', ">2.5.0"

gem 'httparty'
gem 'faraday', '~> 0.11.0'
# Ketcher editor
gem 'ketcherails', git: 'https://github.com/ComPlat/ketcher-rails'

# Free font icons
gem "font-awesome-rails"

# delayed job
gem 'delayed_job_active_record'

# required by cap3 delayed-job but has to be specified manually
gem 'daemons'

# dataset previews
gem 'thumbnailer', :git => 'https://github.com/merlin-p/thumbnailer.git'

# data integrity
gem "paranoia", "~> 2.0"

gem "whenever", require: false
gem "backup"
gem 'yaml_db'

gem "ruby-ole"

# CI
gem 'coveralls', require: false

# openbabel
# to compile from github/openbabel/openbabel master
#gem 'openbabel', '2.4.1.2', git: 'https://github.com/ComPlat/openbabel-gem'
# to compile from github/openbabel/openbabel branch openbabel-2-4-x
gem 'openbabel', '2.4.0.1', git: 'https://github.com/ComPlat/openbabel-gem', branch: 'openbabel-2-4-x'

gem 'prawn'
gem 'prawn-svg'
gem 'barby'
gem 'rqrcode'

group :development do
  gem 'web-console', '~> 2.0'
  gem 'better_errors' # allows to debug exception on backend from browser
end

group :development, :test do

  gem 'mailcatcher'

  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug'

  # Access an IRB console on exception pages or by using <%= console %> in views

  gem 'bullet'

  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem 'spring'

  # Testing
  gem 'rspec-rails'

  # Use thin as dev webserver
  gem 'thin'

  # generate icon fonts
  gem 'fontcustom'

  gem 'capistrano', '3.4.1'
  gem 'capistrano-rvm'
  gem 'capistrano-bundler'
  gem 'capistrano-rails'
  gem 'capistrano-nvm', require: false
  gem 'capistrano-npm'
  # gem 'capistrano3-delayed-job'
end

group :test do
  gem 'factory_girl_rails'
  gem 'database_cleaner'

  gem 'webmock'
  gem "faker", "~> 1.6.6"
  gem "capybara", "~> 2.7.1"
  gem "launchy", "~> 2.4.3"
  gem "selenium-webdriver", "~> 3.0.5"
  gem "chromedriver-helper", "1.0.0"
  gem "headless", "2.0.0"
end

# Chemotion plugins: list your chemotion specific plugin gems here

#gem 'scifinding', '0.1.0', git: 'https://github.com/ComPlat/scifinding' , :group => [:plugins,:development,:production]

####
