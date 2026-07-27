# frozen_string_literal: true

module Chemotion
  # Flattens Chemotion analysis "Content" into plain text.
  #
  # Analysis content (container.extended_metadata.content) is stored as a Quill
  # Delta — either a Hash/Array of ops, or a JSON string of the same. Free-text
  # measurements typed by chemists live in the `insert` strings. LLM tasks need
  # plain text, so this joins the ops' string inserts (ignoring embeds/formats).
  #
  # Usage:
  #   Chemotion::QuillDeltaText.to_text({ 'ops' => [{ 'insert' => '1H NMR ...' }] })
  #   # => "1H NMR ..."
  #
  module QuillDeltaText
    module_function

    # @param content [String, Hash, Array, nil]
    # @return [String]
    def to_text(content)
      case content
      when String
        parse_string(content)
      when Hash
        ops = content['ops'] || content[:ops]
        ops.is_a?(Array) ? delta_to_text(ops) : ''
      when Array
        delta_to_text(content)
      when nil
        ''
      else
        content.to_s
      end
    end

    # Join the string `insert`s of a Quill ops array.
    def delta_to_text(ops)
      ops.map do |op|
        insert = op.is_a?(Hash) ? (op['insert'] || op[:insert]) : op
        insert.is_a?(String) ? insert : ''
      end.join
    end

    # A string may be raw text or a serialised Quill delta (JSON). Try to parse
    # JSON deltas; fall back to the string itself.
    def parse_string(str)
      stripped = str.strip
      return str unless stripped.start_with?('{', '[')

      begin
        to_text(JSON.parse(stripped))
      rescue JSON::ParserError
        str
      end
    end
  end
end
