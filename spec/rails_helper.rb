# frozen_string_literal: true

# This file is copied to spec/ when you run 'rails generate rspec:install'
ENV['RAILS_ENV'] ||= 'test'
require 'spec_helper'
require File.expand_path('../config/environment', __dir__)
require 'rspec/rails'
# require 'capybara/rails'

require 'devise'
# Add additional requires below this line. Rails is not loaded until this point!

# Requires supporting ruby files with custom matchers and macros, etc, in
# spec/support/ and its subdirectories. Files matching `spec/**/*_spec.rb` are
# run as spec files by default. This means that files in spec/support that end
# in _spec.rb will both be required and run as specs, causing the specs to be
# run twice. It is recommended that you do not name files matching this glob to
# end with _spec.rb. You can configure this pattern with the --pattern
# option on the command line or in ~/.rspec, .rspec or `.rspec-local`.
#
# The following line is provided for convenience purposes. It has the downside
# of increasing the boot-up time by auto-requiring all files in the support
# directory. Alternatively, in the individual `*_spec.rb` files, manually
# require only the support files necessary.
#
Dir[Rails.root.join('spec/support/**/*.rb')].each { |f| require f }

ActiveRecord::Migration.maintain_test_schema!

RSpec.configure do |config|
  config.include RSpec::Rails::RequestExampleGroup,
                 type: :request, file_path: %r{ spec/api }
  config.use_transactional_fixtures = false

  config.infer_spec_type_from_file_location!

  # config.include Devise::TestHelpers, type: :controller
  # config.extend ControllerMacros, type: :controller
  config.include ControllerHelpers, type: :controller
  config.include Devise::Test::ControllerHelpers, type: :controller
  config.include LoginMacros
  config.include CapybaraHelpers
  config.include ReportHelpers
  config.include PubchemHelpers
end
