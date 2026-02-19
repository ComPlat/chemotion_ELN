# frozen_string_literal: true

module IdNormalizer
  module_function

  INTEGER_STRING = /\A[+-]?\d+\z/

  def normalize_integer(value)
    return value if value.is_a?(Integer)
    return unless value.is_a?(String) && value.match?(INTEGER_STRING)

    value.to_i
  end

  def normalize_integer_array(values)
    Array(values).flatten.filter_map { normalize_integer(_1) }.uniq
  end
end
