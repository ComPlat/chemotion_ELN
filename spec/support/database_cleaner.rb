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
    warn "[database_cleaner] first clean attempt failed for #{RSpec.current_example&.full_description}: " \
         "#{e.class}: #{e.message} - retrying once"
    sleep 2
    DatabaseCleaner.clean
  end
end
