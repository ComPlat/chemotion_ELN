# frozen_string_literal: true

class SumFormula < Hash
  ELEMENT_REGEXP = /\A[A-Z][a-z]*\z/.freeze
  NUMBER_REGEXP = /\d+(?:\.\d+)?/.freeze

  def initialize(formula = '')
    super()
    @formula = formula
    parse_formula.each do |element, count|
      self[element] = fetch(element, 0) + count
    end
  end

  # Add a fragment to the formula
  # @param formula [String, Hash, SumFormula] the fragment to add
  # @return [SumFormula]
  def add_fragment(formula)
    dup.add_fragment!(formula)
  end

  # Add a fragment to the formula in place
  # @param formula [String, Hash, SumFormula] the fragment to add
  # @return [self]
  def add_fragment!(formula)
    parse_arg(formula).each { |atom, count| self[atom] = fetch(atom, 0) + count }
    self
  end

  # Remove a fragment from the formula
  # @param formula [String, Hash, SumFormula] the fragment to remove
  # @return [SumFormula]
  def remove_fragment(formula)
    dup.remove_fragment!(formula)
  end

  def remove_fragment!(formula)
    parse_arg(formula).each { |atom, count| self[atom] = fetch(atom, 0) - count }
    self
  end

  # Multiply the counts of all elements by a given number
  # @param number [Numeric] the number to multiply by
  # @return [SumFormula]
  def multiply_by(number)
    dup.multiply_by!(number)
  end

  def multiply_by!(number)
    transform_values! { |value| value * number }
  end

  # Remove elements with zero or negative counts
  # @return [self]
  def trim
    dup.trim!
  end

  def trim!
    select! { |_, count| count.positive? }
    self
  end

  # Sum formula as a String
  # @return [String] the sum formula
  # @note non-element keys and negative values are ignored
  def valid!
    trim!
    select! do |key, value|
      ChemicalElements::PeriodicTable.find(key) && value.positive?
    rescue StandardError
      false
    end
    self
  end

  def valid
    dup.valid!
  end

  # Convert the formula to a raw string representation
  # @note This method does not check for valid elements
  # @return [String] the raw string representation
  def to_s
    keys.sort.map do |key|
      value = self[key]
      value == 1 ? key : "#{key}#{value}"
    end.join
  end

  # Molecular weight from the formula (decoupled samples)
  # @return [Float] the average molecular weight
  # @note non-element keys and negative values are ignored
  def molecular_weight
    sum = 0.0
    valid.each do |element, count|
      sum += ChemicalElements::PeriodicTable.find(element).atomic_amount * count
    end
    sum
  end

  # Parse the formula string and return a hash of elements and their counts
  # @return [Hash] a hash with element symbols as keys and their counts as values
  # @note This method handles nested groups and multipliers
  #   An element token is matched as /([A-Z][a-z]*)(\d+(?:\.\d+)?)?/
  #   Group nesting is defined by parentheses followed by an optional multiplier
  #   Other characters are ignored and the index is incremented
  SPLIT_TOP_LEVEL = lambda do |formula|
    parts = []
    level = 0
    start = 0

    formula.chars.each_with_index do |char, idx|
      case char
      when '(', '['
        level += 1
      when ')', ']'
        level -= 1
      when '.'
        next if level.positive? || decimal_dot?(formula, idx)

        parts << formula[start...idx]
        start = idx + 1
      when '·'
        if level.zero?
          parts << formula[start...idx]
          start = idx + 1
        end
      end
    end
    parts << formula[start..]
    parts
  end

  # rubocop:disable Metrics/BlockLength, Lint/DuplicateBranch
  PARSE_PART = lambda do |part|
    stack = []
    current = { elements: Hash.new(0), multiplier: 1 }

    i = 0
    while i < part.length
      case part[i]
      when '(', '['
        stack << current
        current = { elements: Hash.new(0), multiplier: 1 }
        i += 1
      when ')', ']'
        i += 1
        num, i = extract_number(part, i)
        current[:multiplier] = num.nil? ? 1 : num
        child = current
        current = stack.pop
        child[:elements].each do |el, count|
          current[:elements][el] += count * child[:multiplier]
        end
      when /[A-Z]/
        el = part[i]
        i += 1
        while i < part.length && part[i] =~ /[a-z]/
          el += part[i]
          i += 1
        end
        num, i = extract_number(part, i)
        count = num.nil? ? 1 : num
        current[:elements][el] += count
      when /\d/
        num, i = extract_number(part, i)
        sub_counts = PARSE_PART.call(part[i..])
        multiplier = num || 1
        sub_counts.each { |sub_el, sub_count| current[:elements][sub_el] += sub_count * multiplier }
        break
      when '+', '−', '-'
        i += 1 # Ignore charges
      else
        i += 1
      end
    end

    current[:elements]
  end
  # rubocop:enable Metrics/BlockLength, Lint/DuplicateBranch

  private

  def parse_formula
    formula = @formula
    total_counts = Hash.new(0)
    SPLIT_TOP_LEVEL.call(formula).each do |part|
      part_counts = PARSE_PART.call(part)
      part_counts.each { |el, count| total_counts[el] += count }
    end

    total_counts
  end

  # Parse the input argument and return a new instance of SumFormula
  # @param input [String, Hash, SumFormula] the input argument
  # @return [SumFormula] the parsed SumFormula instance
  def parse_arg(input)
    klass = self.class
    case input
    when String
      klass.new(input)
    when Hash
      input.select { |key, _value| key =~ ELEMENT_REGEXP }
           .each_with_object(klass.new) do |(key, value), formula|
             formula[key] = klass.parse_numeric_value(value)
           end
    when klass
      input
    else
      raise ArgumentError, "Invalid argument type: #{input.class}"
    end
  end

  # True when "." is part of a decimal number, not a top-level separator.
  def self.decimal_dot?(formula, idx)
    idx.positive? &&
      idx < formula.length - 1 &&
      formula[idx - 1].match?(/\d/) &&
      formula[idx + 1].match?(/\d/) &&
      !hydrate_dot?(formula, idx)
  end

  # Heuristic: treat "." as hydrate separator when the right side starts with
  # a coefficient and then looks like a formula fragment (e.g., "5H2O", "2(OH)3").
  def self.hydrate_dot?(formula, idx)
    segment_end = next_top_level_separator_index(formula, idx + 1) || formula.length
    right_segment = formula[(idx + 1)...segment_end]
    match = right_segment.match(/\A\d+(.+)\z/)
    return false unless match

    right_formula = match[1]
    right_formula.match?(/[()\[\]]/) || right_formula.scan(/[A-Z][a-z]*/).uniq.length > 1
  end

  # Find the next top-level dot separator from `from_idx`, ignoring nested groups.
  def self.next_top_level_separator_index(formula, from_idx)
    level = 0
    idx = from_idx

    while idx < formula.length
      case formula[idx]
      when '(', '['
        level += 1
      when ')', ']'
        level -= 1
      when '.', '·'
        return idx if level.zero?
      end
      idx += 1
    end
    nil
  end

  def self.extract_number(text, start_idx)
    match = NUMBER_REGEXP.match(text, start_idx)
    return [nil, start_idx] unless match&.begin(0) == start_idx

    [parse_numeric_token(match[0]), match.end(0)]
  end

  def self.parse_numeric_value(value)
    return value if value.is_a?(Numeric)

    parse_numeric_token(value.to_s)
  end

  def self.parse_numeric_token(token)
    token.include?('.') ? token.to_f : token.to_i
  end

  private_class_method :decimal_dot?, :hydrate_dot?, :next_top_level_separator_index,
                       :extract_number, :parse_numeric_value, :parse_numeric_token
end
