# frozen_string_literal: true

# Normalise multipart/form-data part encodings to UTF-8.
#
# Rack honours a per-part `Content-Type: ...; charset=<enc>` and tags the decoded field
# name/body -- and the RFC 5987 `filename*=` filename -- in that charset. The rest of the
# application treats request strings as UTF-8, so a part that declares a legacy single-byte
# charset (e.g. ISO-8859-1 or Windows-1252) can otherwise reach string handling still tagged
# in that encoding, where comparison and case folding behave inconsistently with the UTF-8
# strings everywhere else.
#
# Transcode any multipart part name/body/filename that is not already UTF-8 / US-ASCII /
# ASCII-8BIT to UTF-8 as soon as Rack has tagged it. Transcoding (not force_encoding) keeps
# the intended characters intact. Ordinary application/x-www-form-urlencoded params are
# already UTF-8 and are unaffected.
require 'rack/multipart/parser'

module MultipartUtf8Encoding
  SAFE_ENCODINGS = [Encoding::UTF_8, Encoding::US_ASCII, Encoding::ASCII_8BIT].freeze

  # Defined as a module method (not via `module_function`) so that the two prepend overrides
  # below stay ordinary public instance methods: a bare `module_function` would also sweep them
  # up, making them private instance methods (plus dead, super-less module singletons).
  def self.to_utf8!(str)
    return unless str.is_a?(::String)
    return if SAFE_ENCODINGS.include?(str.encoding)

    str.encode!(Encoding::UTF_8, invalid: :replace, undef: :replace)
  rescue StandardError
    # Last resort: tag as UTF-8 and drop any bytes that are not valid there, so the string
    # cannot reach the rest of the app as an invalid UTF-8 sequence.
    str.force_encoding(Encoding::UTF_8)
    str.scrub!
  end

  # Non-file parts: Rack sets `name`/`body` to the part charset here.
  def tag_multipart_encoding(filename, content_type, name, body)
    super
  ensure
    MultipartUtf8Encoding.to_utf8!(name)
    MultipartUtf8Encoding.to_utf8!(body)
  end

  # File parts: Rack sets the filename encoding (including RFC 5987 `filename*=`) here.
  def get_filename(head)
    fn = super
    MultipartUtf8Encoding.to_utf8!(fn)
    fn
  end
end

Rack::Multipart::Parser.prepend(MultipartUtf8Encoding)
