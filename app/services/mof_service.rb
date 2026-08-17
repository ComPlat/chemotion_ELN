# frozen_string_literal: true

# MofService talks to the external MOF microservice, which wraps the
# snurr-group `mofid` pipeline. Given a CIF it returns the MOFid / MOFkey
# (and the intermediate SMILES / topology data).
#
# Mirrors IndigoService: base URL from config/mof_service.yml via
# config/initializers/mof_service.rb, reached with HTTParty.
#
# @example
#   result = MofService.new(cif_string).analyze
#   result['mofid']  #=> "... MOFid-v1.tbo.cat0;..."
#   result['mofkey'] #=> "Cu....MOFkey-v1.tbo"
class MofService
  RESULT_KEYS = %w[mofid mofkey smiles smiles_nodes smiles_linkers topology cat ccdc_number].freeze

  FRAGMENT_KEYS = %w[nodes linkers].freeze

  # @param cif [String, nil] the CIF file contents (only needed for #analyze)
  def initialize(cif = nil)
    @cif = cif
    @service_url = Rails.configuration.mof_service&.mof_service_url if Rails.configuration.respond_to?(:mof_service)
  end

  # @return [Boolean] true when the service is not configured / disabled
  def self.disabled?
    return true unless Rails.configuration.respond_to?(:mof_service)

    Rails.configuration.mof_service&.disabled? || false
  end

  # @return [Boolean]
  def self.enabled?
    !disabled? && Rails.configuration.mof_service&.mof_service_url.present?
  end

  # Runs the CIF through the MOF pipeline.
  #
  # @return [Hash, nil] the parsed result (see RESULT_KEYS), or nil on failure
  def analyze
    return nil if disabled? || @cif.blank?

    data = post_json('analyze', { cif: @cif })
    return nil if data.nil? || data['mofid'].blank?

    data.slice(*RESULT_KEYS)
  end

  # Decomposes a drawn structure into MOF nodes and linkers (no CIF needed).
  #
  # @param molfile [String, nil]
  # @param smiles [String, nil]
  # @return [Hash, nil] { 'nodes' => [...], 'linkers' => [...] }, or nil on failure
  def fragment(molfile: nil, smiles: nil)
    return nil if disabled? || (molfile.blank? && smiles.blank?)

    data = post_json('fragment', { molfile: molfile, smiles: smiles }.compact)
    return nil if data.nil?

    data.slice(*FRAGMENT_KEYS)
  end

  private

  # POSTs a JSON payload to the sidecar and returns the parsed body, or nil on
  # any failure (logged). Covers HTTParty::Error, Timeout::Error and the low-level
  # socket errors HTTParty does not wrap (SocketError, Errno::ECONNREFUSED/
  # ECONNRESET/EHOSTUNREACH, EOFError) so a bad host or a killed sidecar returns
  # nil rather than surfacing a raw 500 to the caller.
  def post_json(path, payload)
    return nil if @service_url.blank?

    response = HTTParty.post(
      "#{@service_url.to_s.chomp('/')}/#{path}",
      headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' },
      body: payload.to_json,
      timeout: 180,
    )
    return nil if response.nil?

    unless response.success?
      # The sidecar returns { "error": "<reason>" } on failure; surface it in the log.
      log_error("Sidecar returned HTTP #{response.code}: #{response.body.to_s.truncate(500)}")
      return nil
    end
    return nil if response.body.blank?

    JSON.parse(response.body)
  rescue JSON::ParserError => e
    log_error("Invalid JSON from MOF service: #{e.message}")
    nil
  rescue StandardError => e
    log_error("Request failed: #{e.message}")
    nil
  end

  def disabled?
    self.class.disabled?
  end

  def log_error(message)
    Rails.logger.error("MofService Error: #{message}")
  end
end
