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

gem 'pg'
gem 'pg_search'

gem 'devise'

gem 'browserify-rails'

# for collection tree structure
gem 'ancestry'

# svg composer
gem 'nokogiri'

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
gem 'rmagick'
gem 'axlsx'

# Import of elements from XLS and CSV file
gem 'roo'

# Chemrails
gem 'httparty'
gem 'chemrails', git: 'git://github.com/cominch/chemrails'

# Free font icons
gem "font-awesome-rails"

# Email notifications and so on
gem 'delayed_job_active_record'

# required by cap3 delayed-job but has to be specified manually
gem 'daemons'

# dataset previews
gem 'thumbnailer', :git => 'https://github.com/merlin-p/thumbnailer.git'

group :production do
  if ENV["RAILS_ENV"] == "production"
    gem 'openbabel'
  end
  gem 'unicorn'

end

group :development, :test do
  if ENV.fetch("RAILS_ENV", "development") == "development"
    gem 'openbabel', '2.3.2.1', github: 'cubuslab/openbabel-gem'
  end
  gem 'mailcatcher'

  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug'

  # Access an IRB console on exception pages or by using <%= console %> in views
  gem 'web-console', '~> 2.0'

  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem 'spring'

  # Testing
  gem 'rspec-rails'

  # Use thin as dev webserver
  gem 'thin'

  # generate icon fonts
  gem 'fontcustom'

  gem 'capistrano', '~> 3.4.0'
  gem 'capistrano-rvm'
  gem 'capistrano-bundler'
  gem 'capistrano-rails'
  gem 'capistrano-npm'
  gem 'capistrano3-delayed-job'
  gem 'capistrano3-unicorn'
end

group :test do
  gem 'factory_girl_rails'
  gem 'database_cleaner'
end
