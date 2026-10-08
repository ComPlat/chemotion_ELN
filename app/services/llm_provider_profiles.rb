# frozen_string_literal: true

require 'yaml'

# Loads deployment-configurable LLM provider presets from
# config/llm_provider_profiles.yml.
#
# Design goals:
#   - Fully optional: a missing file yields [] (the UI simply hides the picker).
#   - Safe fallback: a malformed file logs a warning and yields [] — never raises
#     into a request.
#   - Validated: each entry must have key + label; the protocol is normalised to a
#     known LlmClient protocol (unknown → 'openai').
#
# Returns plain hashes suitable for JSON serialisation (no secrets are involved —
# these are endpoint presets, not credentials).
class LlmProviderProfiles
  CONFIG_PATH = Rails.root.join('config/llm_provider_profiles.yml')

  class << self
    # @return [Array<Hash>] validated profile hashes (possibly empty)
    def all
      raw = read_file
      return [] unless raw

      profiles = raw['profiles']
      return [] unless profiles.is_a?(Array)

      profiles.filter_map { |entry| normalize(entry) }
    end

    # The curated model list a deployment configured for this endpoint, or [].
    # Identity is protocol + base_url: the endpoint decides which models exist,
    # and the key that reaches it does not.
    #
    # @return [Array<String>]
    def models_for(base_url:, protocol: 'openai')
      target = normalize_url(base_url)
      wanted = protocol.presence || 'openai'

      profile = all.find do |p|
        p[:models].present? && p[:protocol] == wanted && normalize_url(p[:base_url]) == target
      end
      profile ? profile[:models] : []
    end

    private

    # Trailing slashes are insignificant to the provider, so they must not
    # decide whether a profile matches either. Cf. LlmModelCatalog#normalize_url.
    def normalize_url(base_url)
      base_url.to_s.strip.chomp('/').downcase
    end

    def read_file
      return nil unless File.exist?(CONFIG_PATH)

      YAML.safe_load(File.read(CONFIG_PATH)) || {}
    rescue StandardError => e
      Rails.logger.warn("[LlmProviderProfiles] could not load #{CONFIG_PATH}: #{e.message}")
      nil
    end

    def normalize(entry)
      return nil unless entry.is_a?(Hash)

      key   = entry['key'].to_s.strip
      label = entry['label'].to_s.strip
      return nil if key.blank? || label.blank?

      protocol = entry['protocol'].to_s.strip
      protocol = 'openai' unless LlmClient::PROTOCOLS.include?(protocol)

      models = entry['models']
      models = models.is_a?(Array) ? models.map(&:to_s).compact_blank : []

      {
        key:           key,
        label:         label,
        protocol:      protocol,
        base_url:      entry['base_url'].to_s,
        default_model: entry['default_model'].to_s,
        models:        models,
        notes:         entry['notes'].to_s,
      }
    end
  end
end
