require 'coveralls'
Coveralls.wear!

require 'webmock/rspec'
WebMock.disable_net_connect!(allow_localhost: true)

require 'factory_girl_rails'



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
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/TXWRERCHRDBNLG-UHFFFAOYSA-N/record/JSON").
      with(:headers => {'Content-Type'=>'text/json'}).
      to_return(
        :status => 200,
        :body => File.read(Rails.root+'spec/fixtures/body_TXWRERCHRDBNLG-UHFFFAOYSA-N.json'),
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
