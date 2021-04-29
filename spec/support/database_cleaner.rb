# frozen_string_literal: true

DatabaseCleaner.allow_remote_database_url = (ENV['DOCKER'] == 'true')

RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
  end

  config.before do
    DatabaseCleaner.strategy = :transaction
  end

  config.before(:each, js: true) do
    DatabaseCleaner.strategy = :truncation
  end

  config.before do
    DatabaseCleaner.start
  end

  config.append_after do
    DatabaseCleaner.clean
  rescue Exception => e
    sleep 2
    DatabaseCleaner.clean
  end
end
