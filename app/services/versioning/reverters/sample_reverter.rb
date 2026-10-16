# frozen_string_literal: true

class Versioning::Reverters::SampleReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Sample.with_deleted
  end

  def field_definitions
    {
      boiling_point: range,
      melting_point: range,
    }.with_indifferent_access
  end

  private

  def range
    lambda do |range_string|
      # NULL (as older rows store "not set") or Postgres's empty range
      return if range_string.blank? || range_string == 'empty'

      lower, upper = range_string[1...-1].split(',')
      Range.new(
        (lower.presence || -Float::INFINITY).to_f,
        (upper.presence || Float::INFINITY).to_f,
      )
    end
  end
end
