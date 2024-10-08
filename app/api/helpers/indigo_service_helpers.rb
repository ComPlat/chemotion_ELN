# frozen_string_literal: true

module IndigoServiceHelpers
  def request_indigo_service(struct, output_format)
    service_url = Rails.configuration.indigo_service.indigo_service_url || 'http://indigo_service/'
    options = {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        struct: struct,
        output_format: output_format,
      }.to_json,
    }
    [service_url, options]
  end

  def indigo_call_validate(url, options)
    response = HTTParty.post(url, options)
    if response.success?
      response.body
    else
      { error: 'Failed to contact Indigo service', status: response.code }
    end
  rescue HTTParty::Error => e
    { error: "HTTParty error: #{e.message}" }
  rescue StandardError => e
    { error: "General error: #{e.message}" }
  end
end
