require 'coveralls'
Coveralls.wear!

require 'factory_girl_rails'

RSpec.configure do |config|
  config.include FactoryGirl::Syntax::Methods

  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  RSpec::Expectations.configuration.warn_about_potential_false_positives = false

  config.order = :random
  Kernel.srand config.seed
end
