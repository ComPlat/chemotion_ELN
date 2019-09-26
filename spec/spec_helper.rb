# frozen_string_literal: true

# require 'coveralls'
# Coveralls.wear!
require 'rspec/repeat'
require 'webmock/rspec'

require 'factory_bot_rails'
require 'headless'
require 'capybara'
require 'webdrivers'
# require 'capybara/rspec'
require 'rails_helper'

@headless = Headless.new
@headless.start

Webdrivers.logger.level = :DEBUG

Capybara.register_driver :selenium do |app|
  http_client = Selenium::WebDriver::Remote::Http::Default.new(
    open_timeout: nil,
    read_timeout: 500
  )
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--window-size=2048,768')
  # options.add_argument('--disable-gpu')

  Capybara::Selenium::Driver.new(
    app,
    browser: :chrome,
    http_client: http_client,
    options: options
  )
end

hostname = 'http://pubchem.ncbi.nlm.nih.gov'
inchi_path = '/rest/pug/compound/inchikey/'

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods

  config.before do
    [
      'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
      'YJTKZCDBKVTVBY-UHFFFAOYSA-N',
      'TXWRERCHRDBNLG-UHFFFAOYSA-N',
      'QTBSBXVTEAMEQO-UHFFFAOYSA-N',
      'LFQSCWFLJHTTHZ-UHFFFAOYSA-N',
      'XEKOWRVHYACXOJ-UHFFFAOYSA-N',
      'QAOWNCQODCNURD-UHFFFAOYSA-N',
      'XEGUVFFZWHRVAV-SFOWXEAESA-N',
      'QHDHNVFIKWGRJR-UHFFFAOYSA-N',
      'QHDHNVFIKWGRJR-UHFFFAOYSA-N',
      'XEGUVFFZWHRVAV-PVQJCKRUSA-N'
    ].each do |target|
      stub_request(:get, "#{hostname}#{inchi_path}#{target}/record/JSON")
        .with(headers: { 'Content-Type' => 'text/json' })
        .to_return(
          status: 200,
          body: File.read(
            Rails.root + "spec/fixtures/body_#{target}.json"
          ),
          headers: { 'Content-Type' => 'application/json' }
        )
    end

    stub_request(:post, 'http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/record/JSON')
      .with(headers: { 'Content-Type' => 'text/json' }, body: { 'inchikey' => 'RDHQFKQIGNGIED-UHFFFAOYSA-N,RDHQFKQIGNGIED-UHFFFAOYSA-O' })
      .to_return(
        status: 200,
        body: File.read(Rails.root + 'spec/fixtures/body_two_compounds.json'),
        headers: { 'Content-Type' => 'application/json' }
      )
    stub_request(:get, %r{http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/\S+/xrefs/RN/JSON})
      .with(headers: { 'Content-Type' => 'text/json' })
      .to_return { |_request| { body: xref_from_inchikey } }

    stub_request(:post, 'http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/property/InChIKey/JSON')
      .with(headers: { 'Accept' => '*/*',
                       'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
                       'Content-Type' => 'application/x-www-form-urlencoded' })
      .to_return { |request| { body: get_cids_from_inchikeys(request.body) } }

    stub_request(:get, 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/123456789/XML?heading=CAS')
      .with(headers: { 'Content-Type' => 'text/json' })
      .to_return(
        status: 200,
        body: File.read(Rails.root + 'spec/fixtures/body_123456789_CAS.xml'),
        headers: { 'Content-Type' => 'application/xml' }
      )
    stub_request(:get, %r{http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/\S+/cids/TXT}).
      # with(:headers => {'Content-Type'=>'text/json'}).
      to_return(status: 200, body: '123456789', headers: {})

    # page = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/#{cid}/JSON?heading=GHS%20Classification"
    stub_request(:get, 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/643785/JSON?heading=GHS%20Classification')
      .with(headers: { 'Content-Type' => 'text/json' })
      .to_return(
        status: 200,
        body: File.read(Rails.root + 'spec/fixtures/body_643785_LCSS.json'),
        headers: { 'Content-Type' => 'application/json' }
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

  config.include RSpec::Repeat
  config.around :each, type: :feature do |example|
    repeat example, 3.times, verbose: true
  end
end
