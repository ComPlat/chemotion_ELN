# frozen_string_literal: true

# Hstore type that falls back to Rails 6.1's lenient parsing only for input the
# Rails 7.1 strict parser rejects. Scoped to columns that may receive a nil key.
#
# Rails 7.0/7.1 parse hstore with a strict StringScanner that raises
# ArgumentError "Invalid Hstore document" on an unquoted NULL key — which Rails'
# own serializer emits for a nil key (escape_hstore(nil) => "NULL"). User#counters
# gets a nil key when Labimotion builds a generic element whose element_klass has
# no name (auto_set_short_label writes counters[nil], bypassing increment_counter's
# guard); 7.1's dirty-tracking then deserializes that value and raises.
#
# Normal values go through 7.1 untouched (super); the 6.1 fallback activates only
# on ArgumentError, where a nil key round-trips to the string key "NULL" (verified
# against the real 6.1 gem — not dropped). See DEV_RAILS_UPGRADE_7-1.md (Incident A-3).
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
