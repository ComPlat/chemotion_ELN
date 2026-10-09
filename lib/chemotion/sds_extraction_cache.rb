# frozen_string_literal: true

require 'digest'

module Chemotion
  # One stored SdsExtractor result per sheet content, so a sheet saved by many samples or under
  # several vendor folders is read once. Kept beside the sheets, since the job worker that writes
  # an entry and the web process that answers from it both read that folder.
  module SdsExtractionCache
    FOLDER = '.extractions'
    # A change to any of these can change a result, so their digest is part of every key.
    SOURCES = %w[
      lib/chemotion/sds_extractor.rb lib/chemotion/sds_sections.rb lib/chemotion/sds_phrase_parser.rb
      lib/chemotion/sds_phrase_matcher.rb lib/chemotion/sds_phrase_variants.yml lib/chemotion/sds_pictograms.rb
      lib/chemotion/sds_property_parser.rb lib/chemotion/sds_value_parser.rb lib/chemotion/sds_text_service.rb
      lib/chemotion/chemicals_service.rb
      public/json/hazardPhrases.json public/json/precautionaryPhrases.json public/json/pictograms.json
    ].freeze
    # A failure is kept only until the client may retry, and at least long enough for its 2 s poll to read it.
    FAILURE_TTL = 15.seconds
    RETRY_AFTER_BOUNDS = (5..60).freeze
    KEY = /\A\h{64}-\h{16}\z/.freeze

    module_function

    def root
      GenerateFileHashUtils.safety_sheets_root.join(FOLDER)
    end

    # @param pdf_path [Pathname, String] the saved sheet on disk
    # @return [String] "<sha256 of the sheet>-<digest of the extractor>"
    def key(pdf_path)
      "#{Digest::SHA256.file(pdf_path.to_s).hexdigest}-#{extractor_digest}"
    end

    # @return [Hash, nil] the stored result, or nil when there is none or it has expired
    def read(key)
      entry = JSON.parse(File.read(entry_path(key)))
      return nil if entry['expires_at'] && Time.zone.parse(entry['expires_at']).past?

      entry['result']
    rescue Errno::ENOENT, JSON::ParserError, ArgumentError, TypeError
      nil
    end

    # Written to a temp file and renamed, so a poll never reads half an entry.
    # @param result [Hash] an SdsExtractor result
    def write(key, result)
      path = entry_path(key)
      FileUtils.mkdir_p(root)
      entry = { 'result' => result }
      ttl = failure_ttl(result)
      entry['expires_at'] = ttl.from_now.iso8601 if ttl
      temp = root.join("#{key}.#{SecureRandom.hex(4)}.tmp")
      File.write(temp, entry.to_json)
      File.rename(temp, path)
      drop_superseded(key)
    ensure
      FileUtils.rm_f(temp) if temp
    end

    # nil for a result without errors, which is kept.
    def failure_ttl(result)
      diagnostics = result['diagnostics'] || {}
      return nil if Array(diagnostics['errors']).empty?

      retry_after(diagnostics)&.seconds || FAILURE_TTL
    end

    # The text service's Retry-After within RETRY_AFTER_BOUNDS, so the entry outlives one poll interval.
    # @return [Integer, nil] seconds, nil when the service gave none
    def retry_after(diagnostics)
      seconds = diagnostics['retry_after'].to_i
      seconds.positive? ? seconds.clamp(RETRY_AFTER_BOUNDS) : nil
    end

    def entry_path(key)
      raise ArgumentError, "not a cache key: #{key}" unless key.to_s.match?(KEY)

      root.join("#{key}.json")
    end

    # Results of the same sheet under an older extractor are never read again.
    def drop_superseded(key)
      sheet = key.split('-').first
      Dir.glob(root.join("#{sheet}-*.json")).each do |file|
        FileUtils.rm_f(file) unless File.basename(file, '.json') == key
      end
    end

    def extractor_digest
      @extractor_digest ||= Digest::SHA256.hexdigest(
        SOURCES.map { |source| Digest::SHA256.file(Rails.root.join(source)).hexdigest }.join,
      )[0, 16]
    end
  end
end
