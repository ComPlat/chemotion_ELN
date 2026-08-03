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
  RESULT_KEYS = %w[mofid mofkey smiles smiles_nodes smiles_linkers topology cat].freeze

  # @param cif [String] the CIF file contents
  def initialize(cif)
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
    return nil if disabled? || @cif.blank? || @service_url.blank?

    response = HTTParty.post(
      "#{@service_url.to_s.chomp('/')}/analyze",
      headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' },
      body: { cif: @cif }.to_json,
      timeout: 180,
    )
    return nil if response.nil? || !response.success? || response.body.blank?

    data = JSON.parse(response.body)
    return nil if data['mofid'].blank?

    data.slice(*RESULT_KEYS)
  rescue JSON::ParserError => e
    log_error("Invalid JSON from MOF service: #{e.message}")
    nil
  rescue StandardError => e
    # Covers HTTParty::Error, Timeout::Error and the low-level socket errors
    # HTTParty does not wrap (SocketError, Errno::ECONNREFUSED/ECONNRESET/
    # EHOSTUNREACH, EOFError) so a bad host or a killed sidecar returns nil
    # rather than surfacing a raw 500 to the caller.
    log_error("Request failed: #{e.message}")
    nil
  end

  private

  def disabled?
    self.class.disabled?
  end

  def log_error(message)
    Rails.logger.error("MofService Error: #{message}")
  end
end
