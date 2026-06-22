# frozen_string_literal: true

module Lcms
  # Builds and caches a lightweight index of `##PAGE=` blocks for an LCMS
  # `mz/ms` JCamp attachment.
  #
  class PageIndexer
    CACHE_NAMESPACE = 'lcms:page_index'
    CACHE_TTL = 1.day
    READ_CHUNK = 64 * 1024
    PAGE_HEADER_REGEX = /^##PAGE.*?([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/.freeze

    class << self
      def for(attachment)
        return empty_index if attachment.nil?

        cache_key = build_cache_key(attachment)
        if cache_key && Rails.cache
          cached = Rails.cache.read(cache_key)
          return cached if cached && cached[:pages].any?

          index = build(attachment)

          Rails.cache.write(cache_key, index, expires_in: CACHE_TTL) if index[:pages].any?
          index
        else
          build(attachment)
        end
      end

      def invalidate(attachment)
        cache_key = build_cache_key(attachment)
        Rails.cache.delete(cache_key) if cache_key && Rails.cache
      end

      def build(attachment)
        path = attachment_path(attachment)
        if path.present? && File.exist?(path)
          build_from_file(path, polarity_hint(attachment))
        else
          build_from_string(safe_read(attachment), polarity_hint(attachment))
        end
      rescue StandardError => e
        Rails.logger.warn(
          "[Lcms::PageIndexer] build failed attachment_id=#{attachment&.id}: #{e.class}: #{e.message}",
        )
        empty_index
      end

      private

      def build_cache_key(attachment)
        return nil unless attachment&.id && attachment.respond_to?(:updated_at)

        version = attachment.updated_at.to_i
        "#{CACHE_NAMESPACE}:#{attachment.id}:#{version}"
      end

      def attachment_path(attachment)
        return nil if attachment.nil?
        return nil unless attachment.respond_to?(:abs_path)

        attachment.abs_path.to_s.presence
      end

      def safe_read(attachment)
        attachment&.read_file.to_s
      rescue StandardError
        ''
      end

      def polarity_hint(attachment)
        name = attachment&.filename.to_s.downcase
        return 'positive' if name.match?(/(?:^|[._-])(plus|positive|pos)(?:[._-]|$)/)
        return 'negative' if name.match?(/(?:^|[._-])(minus|negative|neg)(?:[._-]|$)/)

        nil
      end

      def empty_index
        { prefix_size: 0, polarity: nil, pages: [] }.freeze
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def build_from_file(path, name_polarity)
        pages = []
        prefix_size = 0
        scan_mode = nil
        File.open(path, 'rb') do |io|
          buffer = +''
          line_offset = 0
          io.each_line do |line|
            if line.start_with?('##PAGE')
              if pages.any?
                pages.last[:byte_end] = line_offset
              elsif prefix_size.zero?
                prefix_size = line_offset
              end
              page_value = parse_page_value(line)
              pages << { page_value: page_value, byte_start: line_offset, byte_end: nil } if page_value
            elsif pages.empty? && scan_mode.nil? && line.include?('SCAN_MODE')
              scan_mode = extract_scan_mode(line)
            end
            line_offset += line.bytesize
            buffer.clear
          end
          pages.last[:byte_end] = io.size if pages.any? && pages.last[:byte_end].nil?
          prefix_size = io.size if prefix_size.zero? && pages.empty?
        end
        {
          prefix_size: prefix_size,
          polarity: name_polarity || polarity_from_scan_mode(scan_mode),
          pages: pages.map(&:freeze).freeze,
        }.freeze
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def build_from_string(raw, name_polarity)
        return empty_index if raw.blank?

        pages = []
        prefix_size = 0
        offset = 0
        scan_mode = nil
        raw.each_line do |line|
          if line.start_with?('##PAGE')
            if pages.any?
              pages.last[:byte_end] = offset
            elsif prefix_size.zero?
              prefix_size = offset
            end
            page_value = parse_page_value(line)
            pages << { page_value: page_value, byte_start: offset, byte_end: nil } if page_value
          elsif pages.empty? && scan_mode.nil? && line.include?('SCAN_MODE')
            scan_mode = extract_scan_mode(line)
          end
          offset += line.bytesize
        end
        pages.last[:byte_end] = raw.bytesize if pages.any? && pages.last[:byte_end].nil?
        prefix_size = raw.bytesize if prefix_size.zero? && pages.empty?
        {
          prefix_size: prefix_size,
          polarity: name_polarity || polarity_from_scan_mode(scan_mode),
          pages: pages.map(&:freeze).freeze,
        }.freeze
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      def parse_page_value(line)
        match = line.match(PAGE_HEADER_REGEX)
        return nil unless match

        Float(match[1])
      rescue ArgumentError, TypeError
        nil
      end

      def extract_scan_mode(line)
        match = line.match(/SCAN_MODE\s*=\s*(.+)/i)
        match&.[](1)&.strip
      end

      def polarity_from_scan_mode(scan_mode)
        return nil if scan_mode.blank?

        downcased = scan_mode.downcase
        return 'positive' if downcased.include?('posit')
        return 'negative' if downcased.include?('negat')

        nil
      end
    end
  end
end
