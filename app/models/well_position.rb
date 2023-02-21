# frozen_string_literal: true

class WellPosition
  attr_reader :x, :y # Well Positions start at 1

  def self.from_string(string)
    return if string.blank?

    y = ('A'..'H').to_a.index(string.first) + 1
    x = string[1..].to_i

    new(x: x, y: y)
  end

  def self.all
    positions = []
    (1..12).each do |x|
      (1..8).each do |y|
        positions.push(new(x: x, y: y))
      end
    end

    positions.sort
  end

  def initialize(x:, y:) # rubocop:disable Naming/MethodParameterName
    raise "Invalid position - X = #{x}, Y = #{y}" unless x.in?(1..12) && y.in?(1..8)

    @x = x
    @y = y
  end

  def <=>(other)
    [y, x] <=> [other.y, other.x]
  end

  def ==(other)
    return false unless other.is_a?(WellPosition)

    (x == other.x) && (y == other.y)
  end

  def alphanumeric_position
    row = ('A'..'Z').to_a[y - 1] # -1 to account for 1 based positions

    "#{row}#{format('%02i', x)}"
  end
  alias_method :to_s, :alphanumeric_position # rubocop:disable Style/Alias
end
