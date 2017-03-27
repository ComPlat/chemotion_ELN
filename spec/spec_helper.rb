require 'coveralls'
Coveralls.wear!

require 'webmock/rspec'
WebMock.disable_net_connect!(allow_localhost: true)

require 'factory_girl_rails'
require 'headless'
require 'capybara'

@headless = Headless.new
@headless.start

Capybara.register_driver :selenium do |app|
  http_client = Selenium::WebDriver::Remote::Http::Default.new
  http_client.read_timeout = 100
  Capybara::Selenium::Driver.new(app, browser: :chrome, :http_client => http_client)
end

RSpec.configure do |config|
  config.include FactoryGirl::Syntax::Methods

  config.before(:each) do
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/XLYOFNOQVPJJNP-UHFFFAOYSA-N/record/JSON").
      with(:headers => {'Content-Type'=>'text/json'}).
      to_return(
        :status => 200,
        :body => File.read(Rails.root+'spec/fixtures/body_XLYOFNOQVPJJNP-UHFFFAOYSA-N.json'),
        :headers => {"Content-Type"=> "application/json"}
      )
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/YJTKZCDBKVTVBY-UHFFFAOYSA-N/record/JSON").
      with(:headers => {'Content-Type'=>'text/json'}).
      to_return(
        :status => 200,
        :body => File.read(Rails.root+'spec/fixtures/body_YJTKZCDBKVTVBY-UHFFFAOYSA-N.json'),
        :headers => {"Content-Type"=> "application/json"}
      )
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/TXWRERCHRDBNLG-UHFFFAOYSA-N/record/JSON").
      with(:headers => {'Content-Type'=>'text/json'}).
      to_return(
        :status => 200,
        :body => File.read(Rails.root+'spec/fixtures/body_TXWRERCHRDBNLG-UHFFFAOYSA-N.json'),
        :headers => {"Content-Type"=> "application/json"}
      )
    stub_request(:post, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/record/JSON").
      with(:headers => {'Content-Type'=>'text/json'}, :body =>{"inchikey"=>"RDHQFKQIGNGIED-UHFFFAOYSA-N,RDHQFKQIGNGIED-UHFFFAOYSA-O"}).
      to_return(
        :status => 200,
        :body => File.read(Rails.root+'spec/fixtures/body_two_compounds.json'),
        :headers => {"Content-Type"=> "application/json"}
      )

  end

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
