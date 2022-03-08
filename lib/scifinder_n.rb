# SciFinder-n Library
module ScifinderN
  include HTTParty

  def self.retrieve_access(url, data)
    options = { timeout: 20, headers: { 'Content-Type' => 'application/x-www-form-urlencoded' }, body: URI.encode_www_form(data) }
    HTTParty.post(url, options)
  end

  def self.search_api(url, data, token)
    options = {
      timeout: 10,
      headers: { 'accept' => 'application/json', 'Content-Type' => 'application/json', 'Authorization' => "Bearer #{token}" },
      body: data
    }
    HTTParty.post(url, options)
  end

  def self.get_authorization(provider, data)
    options = { timeout: 20, headers: { 'Content-Type' => 'application/x-www-form-urlencoded' }, body: URI.encode_www_form(data) }
    HTTParty.post(URI.join(provider[:sso], provider[:token_endpoint]), options)
  end

  def self.get_metadata(provider)
    HTTParty.get(URI.join(provider[:host], provider[:metadata]))
  rescue StandardError => e
    Rails.logger.error("Error while fetching metadata: #{e}")
    nil
  end
end