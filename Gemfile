# frozen_string_literal: true

source 'https://rubygems.org'

gem 'aasm'
gem 'activejob-status'
gem 'activerecord-nulldb-adapter'
gem 'ancestry'
gem 'api-pagination'
gem 'caxlsx'

gem 'barby'
gem 'bcrypt_pbkdf'
gem 'bibtex-ruby'
gem 'bootsnap'
gem 'bootstrap', '~> 5.3'
gem 'charlock_holmes'
gem 'closure_tree'
gem 'countries'

gem 'delayed_cron_job'
gem 'delayed_job_active_record'
gem 'devise'
gem 'dotenv-rails', require: 'dotenv/rails-now'

gem 'ed25519'

gem 'faker', require: false
gem 'faraday'
gem 'faraday-follow_redirects'
gem 'faraday-multipart'
gem 'font-awesome-rails'
gem 'fugit'
gem 'fx'

gem 'grape'
gem 'grape-entity'
gem 'grape-kaminari'
gem 'grape-swagger'
gem 'grape-swagger-entity'
gem 'grape-swagger-rails'

gem 'graphql', '< 2.2'

gem 'haml-rails'
gem 'hashie-forbidden_attributes'
gem 'httparty'

gem 'icalendar'
gem 'image_processing', '~> 1.8'
gem 'inchi-gem', git: 'https://github.com/ComPlat/inchi-gem.git', branch: 'main'

gem 'jquery-rails' # must be in, otherwise the views lack jquery, even though the gem is supplied by ketcher-rails
gem 'jwt'

gem 'kaminari'
gem 'kaminari-grape'

gem 'labimotion', '2.0.0'
gem 'logidze'

gem 'mimemagic', '0.3.10'
gem 'mime-types'

# locked to enforce latest version of net-scp. without lock net-ssh would be updated first which locks
# out newer net-scp versions
gem 'net-scp', '3.0.0'
gem 'net-sftp'
gem 'net-ssh'
gem 'nokogiri'

gem 'omniauth', '~> 1.9.1'
gem 'omniauth-github', '~> 1.4.0'
gem 'omniauth-oauth2', '~> 1.7', '>= 1.7.2'
gem 'omniauth_openid_connect'
gem 'omniauth-orcid', git: 'https://github.com/datacite/omniauth-orcid'
gem 'omniauth-shibboleth'

gem 'chemical_elements'
gem 'openbabel', '2.4.90.3', git: 'https://github.com/ptrxyz/openbabel-gem.git', branch: 'ptrxyz-ctime-fix'
gem 'pandoc-ruby'
gem 'paranoia', '2.6.0'
gem 'pg'
gem 'pg_search'
gem 'prawn'
gem 'prawn-svg'
gem 'puma', '< 6.0.0'
gem 'pundit'

gem 'rack'
gem 'rack-cors', require: 'rack/cors'
gem 'rails', '~> 6.1.7.7'
gem 'rinchi-gem', git: 'https://github.com/ComPlat/rinchi-gem.git', branch: 'main'
gem 'rmagick'
gem 'roo'
gem 'rqrcode' # required for Barby to work but not listed as its dependency -_-
gem 'rtf'
gem 'ruby-geometry', require: 'geometry'
gem 'ruby-mailchecker'
gem 'ruby-ole'

gem 'sablon', git: 'https://github.com/ComPlat/sablon'
gem 'sassc-rails'
gem 'scenic'
gem 'schmooze'
gem 'semacode', git: 'https://github.com/toretore/semacode.git', branch: 'master' # required for Barby but not listed...
gem 'shakapacker', '~> 8.3.0'

gem 'sentry-delayed_job'
gem 'sentry-rails'
gem 'sentry-ruby'
gem 'shrine', '~> 3.0'
gem 'sys-filesystem'

gem 'thor'
gem 'thumbnailer', git: 'https://github.com/merlin-p/thumbnailer.git'
gem 'turbo-sprockets-rails4'
gem 'tzinfo-data'

gem 'whenever', require: false

gem 'yaml_db'

group :development do
  gem 'better_errors' # allows to debug exception on backend from browser

  gem 'fast_stack'    # For Ruby MRI 2.0
  gem 'flamegraph'

  gem 'memory_profiler'

  #  gem 'rack-mini-profiler', git: 'https://github.com/MiniProfiler/rack-mini-profiler'
  gem 'stackprof' # For Ruby MRI 2.1+

  gem 'web-console'
end

group :vscode do
  gem 'debase'
  gem 'ruby-debug-ide'
  gem 'solargraph'
end

group :development, :test do
  gem 'annotaterb'
  gem 'awesome_print'

  gem 'binding_of_caller'
  gem 'bullet'
  gem 'byebug'

  gem 'chronic'

  gem 'listen'

  gem 'meta_request'

  gem 'pry', '>= 0.14.2'
  gem 'pry-byebug'
  gem 'pry-rails'

  gem 'rubocop', require: false
  gem 'rubocop-performance', require: false
  gem 'rubocop-rails', require: false
  gem 'rubocop-rspec', require: false

  gem 'rspec'
  gem 'rspec-rails'
  gem 'ruby_jard'

  gem 'spring'
end

group :test do
  gem 'capybara'
  gem 'cypress-on-rails'

  gem 'database_cleaner'
  gem 'database_cleaner-active_record'

  gem 'factory_bot_rails'

  gem 'launchy'

  gem 'rspec-repeat'

  gem 'shoulda-matchers'

  gem 'simplecov', require: false
  gem 'simplecov-lcov', require: false

  gem 'webdrivers'
  gem 'webmock'
end
