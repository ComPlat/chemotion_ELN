# frozen_string_literal: true

# Hstore type that falls back to Rails 6.1's lenient parsing only for input the 7.1 strict
# parser rejects — namely an unquoted NULL key, which Rails emits for a nil key (User#counters
# gets one from Labimotion's nameless generic elements). Normal values use 7.1 (super); the
# 6.1 fallback round-trips a nil key to "NULL".
require 'active_record/connection_adapters/postgresql/oid/hstore'

class LenientHstoreType < ActiveRecord::ConnectionAdapters::PostgreSQL::OID::Hstore
  # Verbatim from activerecord-6.1.7.10 hstore.rb.
  HstorePair = begin
    quoted_string = /"[^"\\]*(?:\\.[^"\\]*)*"/
    unquoted_string = /(?:\\.|[^\s,])[^\s=,\\]*(?:\\.[^\s=,\\]*|=[^,>])*/
    /(#{quoted_string}|#{unquoted_string})\s*=>\s*(#{quoted_string}|#{unquoted_string})/
  end

  def deserialize(value)
    super
  rescue ArgumentError
    lenient_deserialize(value)
  end

  private

  # Rails 6.1's regex-scan deserialization (tolerates the malformed input 7.1 rejects).
  def lenient_deserialize(value)
    return value unless value.is_a?(::String)

    ::Hash[value.scan(HstorePair).map do |k, v|
      v = v.upcase == 'NULL' ? nil : v.gsub(/\A"(.*)"\Z/m, '\1').gsub(/\\(.)/, '\1')
      k = k.gsub(/\A"(.*)"\Z/m, '\1').gsub(/\\(.)/, '\1')
      [k, v]
    end]
  end
end
