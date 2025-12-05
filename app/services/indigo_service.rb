# frozen_string_literal: true

require 'nokogiri'

# IndigoService provides an interface to the Indigo chemical structure rendering service.
#
# @example Rendering a structure as SVG
#   service = IndigoService.new(molfile_string)
#   svg = service.render_structure
#
# @example Fetching Indigo service info
#   service = IndigoService.new(nil)
#   info = service.service_info
#
# @attr [String] struct The chemical structure data (e.g., molfile or SMILES)
# @attr [String] output_format The desired output format (default: 'image/svg+xml')
# @attr [Hash] options Additional rendering options
#
class IndigoService
  # Initializes a new IndigoService instance.
  #
  # @param struct [String] The chemical structure data.
  # @param output_format [String] The output format (default: 'image/svg+xml').
  # @param options [Hash, nil] Rendering options (default: coloring enabled, 300x300 image).
  def initialize(struct, output_format = 'image/svg+xml', options = nil)
    @struct = struct
    @output_format = output_format
    @options = {
      'render-coloring' => false,
      # 'render-base-color' => '0.0, 0.0, 0.0',
      # 'render-bond-line-width' => 1,
      # 'render-relative-thickness' => 1.3,
      'render-bond-length' => 40,
      # 'render-implicit-hydrogens-visible' => true,
      # 'render-label-mode' => 'hetero',
      # 'render-margins' => 10,
      # 'render-stereo-style' => 'old',
      # Font settings - match your example
      'render-font-size' => 22,
      # 'render-font-family' => 'Arial',
    }
    @service_url = Rails.configuration.indigo_service.indigo_service_url
  end

  # Renders the chemical structure using the Indigo service.
  #
  # @return [String, nil] The rendered SVG (or other format), or nil if rendering fails.
  def render_structure
    response = make_request('POST', "#{@service_url}v2/indigo/render", build_request)
    return nil if response&.body.blank? || !response.success?

    # Validate the SVG before returning it
    svg_body = response.body
    return nil unless valid_indigo_svg?(svg_body)

    svg_body
  end

  # Fetches information about the Indigo service.
  #
  # @return [String, nil] The service info as a string, or nil if the request fails.
  def service_info
    response = make_request('GET', "#{@service_url}v2/indigo/info", build_request)
    if response.nil? || !response.success?
      log_error('Failed to fetch service info', response)
      return nil
    end

    JSON.parse(response.body)
  rescue JSON::ParserError => e
    log_error('Invalid JSON from Indigo service', e)
    nil
  end

  # Checks if the given SVG is a valid Indigo SVG.
  #
  # @param svg [String] The SVG string to validate.
  # @return [Boolean] True if valid, false otherwise.
  def valid_indigo_svg?(svg)
    doc = Nokogiri::XML(svg)
    return false if doc.root.nil?
    return false unless doc.root.name == 'svg'

    view_box = doc.root['viewBox']
    return false if view_box.nil? || view_box == '0 0 0 0'

    true
  rescue Nokogiri::XML::SyntaxError => e
    log_error('invalid svg file', e)
    false
  end

  private

  # Removes consecutive newlines in the bonds section of the molfile.
  #
  # @param molfile_string [String] The molfile string to process.
  # @return [String] The processed molfile string.
  def remove_consecutive_newlines_in_bonds(molfile_string)
    return '' if molfile_string.nil?

    atom_start = molfile_string.index('V2000') || molfile_string.index('V3000')
    bond_start = molfile_string.index("\n", atom_start) + 1 if atom_start
    m_end_start = molfile_string.index('M  END')

    return molfile_string unless bond_start && m_end_start

    molfile_string[0...bond_start] +
      molfile_string[bond_start...m_end_start].gsub("\n\n", "\n") +
      molfile_string[m_end_start..]
  end

  # Builds the request payload for Indigo API.
  #
  # @return [Hash] The request options hash.
  def build_request
    {
      headers: { 'Content-Type': 'application/json' },
      body: {
        struct: remove_consecutive_newlines_in_bonds(@struct),
        output_format: @output_format,
        options: @options,
      }.to_json,
    }
  end

  # Makes an HTTP request to the Indigo API.
  #
  # @param method [String, Symbol] The HTTP method ('get' or 'post').
  # @param url [String] The API endpoint URL.
  # @param options [Hash] The request options.
  # @return [HTTParty::Response, nil] The response object or nil on error.
  def make_request(method, url, options = {})
    response = nil
    case method.to_s.downcase
    when 'post'
      request = options
      response = HTTParty.post(
        url,
        headers: request[:headers],
        body: request[:body],
      )
    when 'get'
      response = HTTParty.get(url, options)
    else
      raise ArgumentError, "Unsupported HTTP method: #{method}"
    end

    handle_response(response)
  rescue HTTParty::Error => e
    log_error("HTTParty error: #{e.message}", method, url)
    nil
  rescue StandardError => e
    log_error("General error: #{e.message}", method, url)
    nil
  end

  # Handles the HTTP response from Indigo API.
  #
  # @param response [HTTParty::Response] The response object.
  # @return [HTTParty::Response, nil] The response if successful, nil otherwise.
  def handle_response(response)
    return response if response&.success?

    log_error("Request failed with status #{response&.code || 'unknown'}",
              response&.request&.http_method,
              response&.request&.uri)
    nil
  end

  # Logs errors with context.
  #
  # @param message [String] The error message.
  # @param method [String, nil] The HTTP method (optional).
  # @param url [String, nil] The request URL (optional).
  # @return [void]
  def log_error(message, method = nil, url = nil)
    Rails.logger.error("IndigoService Error: #{message}, Method: #{method}, URL: #{url}")
  end
end
