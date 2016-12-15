module Cdx
  class CdxmlShifter
    REACTANT_Y_SHIFT = 20

    attr_reader :orig_cdxml, :shifter, :lines, :geometry
    def initialize(args)
      @orig_cdxml = args[:orig_cdxml]
      @shifter = args[:shifter]
      @lines = Nokogiri::XML(orig_cdxml)
    end

    def process
      calculate_geometry
      shift_cdxml
      return lines.to_xml, geometry
    end

    private

    def calculate_geometry
      x_min, x_max, y_min, y_max = nil, nil, nil, nil
      lines.css('n').each do |line|
        x, y = line.attributes["p"].value.split(" ").map(&:to_f)
        x_min = x if !x_min || x < x_min
        x_max = x if !x_max || x > x_max
        y_min = y if !y_min || y < y_min
        y_max = y if !y_max || y > y_max
      end
      @geometry = { x_max: x_max, x_min: x_min, x_len: (x_max - x_min),
                    y_max: y_max, y_min: y_min, y_len: (y_max - y_min) }
    end

    def shift_cdxml
      lines.css('n').each do |line|
        x, y = line.attributes["p"].value.split(" ").map(&:to_f)
        line.attributes["p"].value = "#{ x_position(x) + shifter[:x] } #{ y_position(y) + shifter[:y] }"
      end
    end

    def x_position(x)
      x - geometry[:x_min] # the object's left side is on the origin.
    end

    def y_position(y)
      y_top_at_orig = y - geometry[:y_min]
      y_flip = geometry[:y_len] - y_top_at_orig
      y_center_at_orig = y_flip - geometry[:y_len] / 2
      y_bottom_at_orig = y_flip - geometry[:y_len] - REACTANT_Y_SHIFT
      shifter[:is_reactant] ? y_bottom_at_orig : y_center_at_orig
    end
  end
end
