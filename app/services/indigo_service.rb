# frozen_string_literal: true

class IndigoService
  def initialize(struct, output_format = 'image/svg+xml')
    @struct = struct
    @output_format = output_format
    @service_url = Rails.configuration.indigo_service.indigo_service_url || DEFAULT_SERVICE_URL
  end

  def render_structure
    options = build_request
    make_request('POST', "#{@service_url}v2/indigo/render", options)
  end

  def service_info
    options = build_request
    make_request('GET', "#{@service_url}v2/indigo/info", options)
  end

  private

  def build_request
    {
      headers: { 'Content-Type': 'application/json' },
      body: {
        struct: @struct,
        output_format: @output_format,
      }.to_json,
    }
  end

  def make_request(method, url, options = {})
    response =
      case method.to_s.downcase
      when 'post'
        HTTParty.post(url, options)
      when 'get'
        HTTParty.get(url, options)
      else
        return { error: "Unsupported HTTP method: #{method}" }
      end

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
