# frozen_string_literal: true

module Lcms
  # Reads only the bytes for a single `##PAGE=` block from a JCamp attachment
  # using the offsets produced by `Lcms::PageIndexer`, then assembles a
  # standalone single-page JCamp string ready to be returned to the client.
  class PageExtractor
    class << self
      def extract(attachment, page_entry, prefix_size:)
        path = attachment_path(attachment)
        prefix, block = if path.present? && File.exist?(path)
                          read_segments_from_file(path, prefix_size, page_entry)
                        else
                          read_segments_from_string(safe_read(attachment), prefix_size, page_entry)
                        end
        return nil if block.blank?

        build_single_page_jcamp(prefix, block, page_entry[:page_value])
      rescue StandardError => e
        Rails.logger.warn(
          "[Lcms::PageExtractor] extract failed for attachment_id=#{attachment&.id}: " \
          "#{e.class}: #{e.message}",
        )
        nil
      end

      private

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

      def read_segments_from_file(path, prefix_size, page_entry)
        File.open(path, 'rb') do |io|
          prefix = prefix_size.positive? ? io.read(prefix_size).to_s : ''
          io.seek(page_entry[:byte_start])
          length = page_entry[:byte_end].to_i - page_entry[:byte_start].to_i
          block = length.positive? ? io.read(length).to_s : ''
          [prefix, block]
        end
      end

      def read_segments_from_string(raw, prefix_size, page_entry)
        return ['', ''] if raw.blank?

        prefix = prefix_size.positive? ? raw.byteslice(0, prefix_size).to_s : ''
        length = page_entry[:byte_end].to_i - page_entry[:byte_start].to_i
        block = length.positive? ? raw.byteslice(page_entry[:byte_start], length).to_s : ''
        [prefix, block]
      end

      def build_single_page_jcamp(prefix, block, page_value)
        normalized_prefix = prefix.to_s.lines.map(&:rstrip).reject { |line| line == '##END=' }
        normalized_block = block.to_s.lines.map(&:rstrip).reject { |line| line == '##END=' }
        normalized_block[0] = "##PAGE=#{page_value}" if normalized_block[0].to_s.start_with?('##PAGE=')
        "#{(normalized_prefix + normalized_block + ['##END=']).join("\n")}\n"
      end
    end
  end
end
