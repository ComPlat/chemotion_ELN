# frozen_string_literal: true

require 'nokogiri'
require 'base64'

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
  ARIAL_COMPATIBLE_FONT = begin
    path = Rails.root.join('app/assets/fonts/LiberationSans-Regular.ttf')
    encoded = Base64.strict_encode64(File.binread(path))
    [{ name: 'Liberation Sans', data: encoded }].to_json
  rescue StandardError
    nil
  end

  # Initializes a new IndigoService instance.
  #
  # @param struct [String] The chemical structure data.
  # @param output_format [String] The output format (default: 'image/svg+xml').
  # @param options [Hash, nil] Optional overrides: :scale_factor, :label_font_size (e.g. for polymer rendering).
  def initialize(struct, output_format = 'image/svg+xml', options = nil)
    @struct = struct
    @output_format = output_format
    opts = (options || {}).to_h.symbolize_keys
    # Extract scale from options or use default; allow override from options (e.g. when molfile has polymer)
    scale_factor = opts.fetch(:scale_factor, 45)
    bond_length = opts.fetch(:bond_length) { scale_factor * (40.0 / 45) }
    label_font_size = opts.fetch(:label_font_size) { (scale_factor * 8.0 / 15).ceil }
    sub_font_size = opts.fetch(:sub_font_size) { (label_font_size * 0.65).ceil }
    stereo_bond_width = 8
    bond_thickness = 1.6
    unit = 'px'
    @options = {
      'render-coloring' => false,
      # font
      'render-font-size' => label_font_size,
      'render-font-size-sub' => sub_font_size,
      # bond
      'render-bond-length' => bond_length,
      'render-bond-thickness' => bond_thickness,
      'render-stereo-bond-width' => stereo_bond_width,
      # units
      'render-font-size-unit' => unit,
      'render-hash-spacing-unit' => unit,
      'render-bond-thickness-unit' => unit,
      'render-font-size-sub-unit' => unit,
      'render-hash-spacing' => 1.5,
      # others
      'render-margins' => '0,0',
    }.tap { |o| o['render-fonts'] = ARIAL_COMPATIBLE_FONT if ARIAL_COMPATIBLE_FONT }
    @service_url = Rails.configuration.indigo_service.indigo_service_url
  end

  # Checks if Indigo service is disabled
  #
  # @return [Boolean] True if service is disabled, false otherwise
  def self.disabled?
    Rails.configuration.indigo_service&.disabled? || false
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

    # Remove explicit width/height from root <svg> so it scales to fill its container.
    # Ketcher SVGs carry only viewBox (no intrinsic size), so they fill whatever CSS box
    # they're placed in. Indigo emits explicit px dimensions, which prevents upscaling.
    svg_body.sub(/<svg\b[^>]*>/) { |tag| tag.gsub(/\s+(width|height)="[^"]*"/, '') }
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
    struct = remove_consecutive_newlines_in_bonds(@struct)
    # Pixel-scale coords are rescaled in-place to preserve the original orientation.
    # Structures needing a full 2D re-layout (3D, stacked R-groups, 3D projection)
    # are sent through the Indigo layout endpoint instead.
    struct = rescale_pixel_coords(struct) if pixel_scale_coords?(struct)
    struct = request_2d_layout(struct) if needs_2d_layout?(struct)
    {
      headers: { 'Content-Type': 'application/json' },
      body: {
        struct: struct,
        output_format: @output_format,
        options: @options,
      }.to_json,
    }
  end

  # Returns true when V2000 XY coords are in pixel-scale (Ketcher legacy files
  # where bond lengths are ~32px instead of ~1 Å). These need in-place rescaling,
  # not a full re-layout, so the original orientation is preserved.
  def pixel_scale_coords?(molfile_string)
    return false if molfile_string.blank?
    return false unless molfile_string.include?('V2000')

    coords = extract_v2000_coords(molfile_string)
    return false if coords.empty?

    coords.map { |x, y, _| [x.abs, y.abs].max }.max > 50
  end

  # Rescales V2000 atom coords from pixel-scale (Ketcher legacy ~32px/bond) to
  # standard Å-scale (~1 Å/bond), centred at the origin, preserving orientation.
  KETCHER_PIXEL_BOND_LENGTH = 32.0
  def rescale_pixel_coords(molfile_string)
    counts_match = molfile_string.match(/^\s*(\d+)\s+\d+\s+.*V2000/)
    return molfile_string unless counts_match

    atom_count = counts_match[1].to_i
    atom_block_start = molfile_string.index("\n", molfile_string.index('V2000')) + 1
    all_lines = molfile_string[atom_block_start..].lines
    atom_lines = all_lines[0, atom_count]
    rest = all_lines[atom_count..].join

    all_x = atom_lines.map { |l| l[0, 10].to_f }
    all_y = atom_lines.map { |l| l[10, 10].to_f }
    cx = (all_x.min + all_x.max) / 2.0
    cy = (all_y.min + all_y.max) / 2.0
    scale = 1.0 / KETCHER_PIXEL_BOND_LENGTH

    scaled_lines = atom_lines.map do |line|
      next line unless line.length >= 30

      x = (line[0, 10].to_f - cx) * scale
      y = (line[10, 10].to_f - cy) * scale
      z = line[20, 10].to_f
      format('%10.4f%10.4f%10.4f', x, y, z) + line[30..]
    end

    molfile_string[0...atom_block_start] + scaled_lines.join + rest
  end

  # Returns true when the molfile has coordinates Indigo cannot render correctly as-is:
  #   - non-zero Z (3D structure, e.g. WATER from QM geometry)
  #   - stacked atoms sharing XY coords (R-group templates, e.g. multiple_R.mol)
  #   - 3D-projection bond distances > 2 Å (e.g. cubane drawn as 3D projection)
  # Pixel-scale coords are handled separately by pixel_scale_coords? + rescale_pixel_coords.
  def needs_2d_layout?(molfile_string)
    return false if molfile_string.blank?

    coords = extract_atom_coords(molfile_string)
    return false if coords.empty?

    # 3D structure: any atom has non-zero Z
    return true if coords.any? { |_, _, z| z.abs > 0.001 }

    # Stacked atoms: R-group template copies share the same XY
    xy_keys = coords.map { |x, y, _z| [x.round(3), y.round(3)] }
    return true if xy_keys.uniq.size < xy_keys.size

    # 3D-projection: check actual bond lengths from the bond table.
    # Normal 2D bonds ≈ 0.8–1.6 Å; cubane's 3D-projected bonds are ~2.5–3.5 Å.
    return true if any_long_bond?(molfile_string, coords)

    false
  end

  # Returns true if any bond in the V2000 bond table spans more than 2 Å.
  # Non-bonded atoms can be close in 3D projections, so we check bonded pairs.
  def any_long_bond?(molfile_string, coords)
    return false unless molfile_string.include?('V2000')

    counts_match = molfile_string.match(/^\s*(\d+)\s+(\d+)\s+.*V2000/)
    return false unless counts_match

    atom_count = counts_match[1].to_i
    bond_count = counts_match[2].to_i
    return false if bond_count.zero?

    atom_block_start = molfile_string.index("\n", molfile_string.index('V2000')) + 1
    all_lines = molfile_string[atom_block_start..].lines
    bond_lines = all_lines[atom_count, bond_count] || []

    bond_lines.any? do |line|
      parts = line.split
      next false unless parts.length >= 2

      a1 = parts[0].to_i - 1
      a2 = parts[1].to_i - 1
      next false unless a1 >= 0 && a2 >= 0 && a1 < coords.size && a2 < coords.size

      x1, y1 = coords[a1][0], coords[a1][1]
      x2, y2 = coords[a2][0], coords[a2][1]
      (x2 - x1)**2 + (y2 - y1)**2 > 4.0
    end
  end

  # Calls Indigo's layout endpoint to generate clean 2D coordinates.
  # Falls back to the original struct on any error.
  def request_2d_layout(struct)
    response = make_request('POST', "#{@service_url}v2/indigo/layout", {
      headers: { 'Content-Type': 'application/json' },
      body: { struct: struct, output_format: 'chemical/x-mdl-molfile' }.to_json,
    })
    return struct unless response&.success? && response.body.present?

    parsed = JSON.parse(response.body)
    laid_out = parsed['struct'].presence || struct
    # Indigo's layout algorithm can fail for complex 3D structures (e.g. crystal
    # lattices), returning '-nan' coordinates. Fall back so the original XY
    # projection is rendered instead of a blank molecule.
    return struct if laid_out.include?('-nan') || laid_out.match?(/\bnan\b/i)

    laid_out
  rescue JSON::ParserError
    struct
  end

  # Extracts [x, y, z] float triples from V2000 or V3000 atom blocks.
  def extract_atom_coords(molfile_string)
    if molfile_string.include?('V3000')
      extract_v3000_coords(molfile_string)
    elsif molfile_string.include?('V2000')
      extract_v2000_coords(molfile_string)
    else
      []
    end
  end

  def extract_v2000_coords(molfile_string)
    counts_match = molfile_string.match(/^\s*(\d+)\s+\d+\s+.*V2000/)
    return [] unless counts_match

    atom_count = counts_match[1].to_i
    atom_start = molfile_string.index("\n", molfile_string.index('V2000')) + 1
    molfile_string[atom_start..].each_line.first(atom_count).filter_map do |line|
      next unless line.length >= 30
      [line[0, 10].to_f, line[10, 10].to_f, line[20, 10].to_f]
    end
  end

  def extract_v3000_coords(molfile_string)
    coords = []
    in_atom_block = false
    molfile_string.each_line do |line|
      if line.include?('BEGIN ATOM')
        in_atom_block = true
        next
      end
      break if in_atom_block && line.include?('END ATOM')
      next unless in_atom_block && line.start_with?('M  V30 ')

      parts = line.split
      coords << [parts[4].to_f, parts[5].to_f, parts[6].to_f] if parts.length >= 7
    end
    coords
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
