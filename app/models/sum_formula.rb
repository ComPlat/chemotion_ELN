# frozen_string_literal: true

class SumFormula < Hash
  ELEMENT_REGEXP = /([A-Z][a-z]*)/.freeze

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

  private

  # Parse the input argument and return a new instance of SumFormula
  # @param input [String, Hash, SumFormula] the input argument
  # @return [SumFormula] the parsed SumFormula instance
  def parse_arg(input)
    klass = self.class
    case input
    when String
      klass.new(input)
    when Hash
      input.select { |_key| key ~ ELEMENT_REGEXP }
           .each_with_object(klass.new) { |(key, value), formula| formula[key] = value.to_i }
    when klass
      input
    else
      raise ArgumentError, "Invalid argument type: #{input.class}"
    end
  end

  # Parse the formula string and return a hash of elements and their counts
  # @return [Hash] a hash with element symbols as keys and their counts as values
  # @note This method handles nested groups and multipliers
  #   An Element is matched to the pattern /([A-Z][a-z]*)(\d*)/
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
      when '.', '·'
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
        num = ''
        while i < part.length && part[i] =~ /\d/
          num += part[i]
          i += 1
        end
        current[:multiplier] = num.empty? ? 1 : num.to_i
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
        num = ''
        while i < part.length && part[i] =~ /\d/
          num += part[i]
          i += 1
        end
        count = num.empty? ? 1 : num.to_i
        current[:elements][el] += count
      when /\d/
        num = ''
        while i < part.length && part[i] =~ /\d/
          num += part[i]
          i += 1
        end
        sub_counts = PARSE_PART.call(part[i..])
        multiplier = num.to_i
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

  def parse_formula
    formula = @formula
    total_counts = Hash.new(0)
    SPLIT_TOP_LEVEL.call(formula).each do |part|
      part_counts = PARSE_PART.call(part)
      part_counts.each { |el, count| total_counts[el] += count }
    end

    total_counts
  end
end
