# frozen_string_literal: true

module IdNormalizer
  module_function

  def normalize_integer(value)
    return value if value.is_a?(Integer)
    return nil unless value.is_a?(String) && value.match?(/\A[+-]?\d+\z/)

    value.to_i
  rescue ArgumentError, TypeError
    nil
  end

  def normalize_integer_array(values)
    Array(values).flatten.filter_map { |value| normalize_integer(value) }.uniq
  end
end
