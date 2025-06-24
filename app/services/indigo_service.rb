# frozen_string_literal: true

class IndigoService
  def initialize(struct, output_format = 'image/svg+xml')
    @struct = struct
    @output_format = output_format
    @service_url = Rails.configuration.indigo_service.indigo_service_url || DEFAULT_SERVICE_URL
  end

  def render_structure
    options = build_request
    post_request("#{@service_url}v2/indigo/render", options)
  end

  private

  def build_request
    options = {
      headers: { 'Content-Type': 'application/json' },
      body: {
        struct: @struct,
        output_format: @output_format
      }.to_json
    }
    options
  end

  def post_request(url, options)
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
