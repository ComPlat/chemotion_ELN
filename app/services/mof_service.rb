# frozen_string_literal: true

require 'tempfile'

# MofService talks to the chemotion-converter-app, which wraps the snurr-group
# `mofid` pipeline. Given a CIF it returns the MOFid / MOFkey (and the
# intermediate SMILES / topology data).
#
# Mirrors IndigoService: base URL from config/mof_service.yml via
# config/initializers/mof_service.rb, reached with HTTParty. The CIF is sent as
# a multipart `file` field to the converter's POST /mofid endpoint, which needs
# no authentication.
#
# @example
#   result = MofService.new(cif_string).analyze
#   result['mofid']  #=> "... MOFid-v1.tbo.cat0;..."
#   result['mofkey'] #=> "Cu....MOFkey-v1.tbo"
class MofService
  RESULT_KEYS = %w[
    mofid mofkey smiles smiles_nodes smiles_linkers topology cat ccdc_number node_ratios linker_ratios
  ].freeze

  # The converter returns every value as a string under a "mofid." namespace
  # (e.g. "mofid.mofkey"). We strip the prefix so the rest of the stack keeps
  # seeing the bare RESULT_KEYS above.
  MOFID_PREFIX = 'mofid.'

  # node_ratios / linker_ratios arrive as comma-separated integer strings
  # (e.g. "3" or "3,4"); the frontend expects integer arrays aligned with the
  # '.'-separated smiles_nodes / smiles_linkers.
  RATIO_KEYS = %w[node_ratios linker_ratios].freeze

  # The converter tags both identifiers with its build, e.g.
  # "...MOFid-v1.tbo.cat0.mofidwrapper0.1.0-mofid36873683". The standard MOFid /
  # MOFkey end before that tag, so it is dropped.
  WRAPPER_SUFFIX = /\.mofidwrapper[^;\s]*/.freeze

  # @param cif [String, nil] the CIF file contents
  # @param filename [String, nil] the uploaded CIF's original name. The MOFid's
  #   name part (after ';') is taken from it, because the converter only sees
  #   our temp file and rewrites names anyway (e.g. "755080 (1)" -> "755080__1").
  def initialize(cif = nil, filename: nil)
    @cif = cif
    @name = File.basename(filename.to_s, '.*').presence
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

  # Runs the CIF through the converter's MOF pipeline.
  #
  # @return [Hash, nil] the parsed result (see RESULT_KEYS), or nil on failure
  #   (including the empty {} the converter returns when its Java/mofid runtime
  #   is missing).
  def analyze
    return nil if disabled? || @cif.blank?

    data = post_cif(@cif)
    return nil if data.blank?

    result = normalize(data)
    return nil if result['mofid'].blank?

    result.slice(*RESULT_KEYS)
  end

  private

  # Strip the "mofid." namespace, clean the identifiers and turn the ratio
  # strings into integer arrays.
  def normalize(data)
    result = data.transform_keys { |key| key.delete_prefix(MOFID_PREFIX) }
    clean_identifiers!(result)
    RATIO_KEYS.each do |ratio_key|
      next if result[ratio_key].blank?

      result[ratio_key] = result[ratio_key].to_s.split(',').filter_map { |n| Integer(n.strip, exception: false) }
    end
    result
  end

  # Drop the converter's build tag and name the MOFid after the original file.
  def clean_identifiers!(result)
    %w[mofid mofkey].each do |key|
      result[key] = result[key].to_s.sub(WRAPPER_SUFFIX, '') if result[key].present?
    end
    result['mofid'] = with_name(result['mofid']) if result['mofid'].present?
  end

  # POSTs the CIF as a multipart `file` field to the converter's /mofid endpoint
  # and returns the parsed body, or nil on any failure (logged). Covers
  # HTTParty::Error, Timeout::Error and the low-level socket errors HTTParty does
  # not wrap (SocketError, Errno::ECONNREFUSED/ECONNRESET/EHOSTUNREACH, EOFError)
  # so a bad host or a killed converter returns nil rather than surfacing a raw
  # 500 to the caller.
  def post_cif(cif)
    return nil if @service_url.blank?

    file = Tempfile.new(['mof', '.cif'])
    file.binmode
    file.write(cif)
    file.rewind

    response = HTTParty.post(
      "#{@service_url.to_s.chomp('/')}/mofid",
      headers: { 'Accept' => 'application/json' },
      body: { file: file },
      multipart: true,
      timeout: 180,
    )

    unless response.success?
      # The converter returns { "error": "<reason>" } on failure; log it.
      log_error("Converter returned HTTP #{response.code}: #{response.body.to_s.truncate(500)}")
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
  ensure
    if file
      file.close
      file.unlink
    end
  end

  # Replace the converter's name (our random temp filename) with the original
  # one; without an original filename, leave the name off.
  def with_name(mofid)
    identifier = mofid.split(';', 2).first
    @name ? "#{identifier};#{@name}" : identifier
  end

  def disabled?
    self.class.disabled?
  end

  def log_error(message)
    Rails.logger.error("MofService Error: #{message}")
  end
end
