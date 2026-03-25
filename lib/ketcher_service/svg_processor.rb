# frozen_string_literal: true

module KetcherService
  # rubocop:disable all
  class SVGProcessor
    attr_accessor :margins, :remove_internal_transform
    attr_reader :min,:max,:svg,:shift

    def initialize(svg="",**options)
      @svg = Nokogiri::XML(svg)
      @min,@max=[nil,nil],[nil,nil]
      @margins= (options[:margins].is_a?(Array)&& options[:margins])  || [20,20]
      @width = (options[:width].is_a?(Integer) && options[:width])
      @height = (options[:height].is_a?(Integer) && options[:height])
    end

    def paths
      # Namespace-agnostic: Indigo (and others) use xmlns="http://www.w3.org/2000/svg"
      @paths = @svg.xpath('//*[local-name()="path"]')
    end

    def circles
      @circles = @svg.xpath('//*[local-name()="circle"]')
    end

    def texts
      @texts = @svg.xpath('//*[local-name()="text"]')
    end

    def clean
      @svg.search('rect').each do |rect|
        if [rect["x"],rect["y"],rect["width"],rect["height"]]== ["0","0","10","10"]
          rect.remove
        end
      end
      @svg.search('desc').each(&:remove)
    end

    def find_extrema
      path_extrema
      circle_extrema
      text_extrema
      image_extrema
      self
    end

    # Bounding box for embedded <image> elements (e.g. surface chemistry, epam-ketcher-ssc).
    # Used to trim extra whitespace from image-containing SVGs.
    # Applies cumulative transform so bounds are correct when images live inside a <g>.
    def image_extrema
      @svg.xpath('//*[local-name()="image"]').each do |element|
        x = (element["x"] || 0).to_f
        y = (element["y"] || 0).to_f
        w = (element["width"] || 0).to_f
        h = (element["height"] || 0).to_f
        next if w <= 0 || h <= 0
        sx, sy = get_cumulative_transform_shift(element)
        coordinates = [[x + sx, y + sy], [x + w + sx, y + h + sy]]
        minmax(coordinates)
      end
    end

    # Cleans and trims SVG by removing extra whitespace and fitting viewBox to content.
    # Works for both path/circle/text SVGs and image-containing SVGs (surface chemistry).
    def self.clean_and_trim_svg(svg_string)
      return nil if svg_string.blank?
      processor = new(svg_string)
      processor.centered_and_scaled_svg
    rescue StandardError => e
      Rails.logger.error("KetcherService::SVGProcessor.clean_and_trim_svg failed: #{e.message}")
      nil
    end

    def get_internal_transform_shift(path)
      transformation = path["transform"]

      if transformation.nil? or transformation.empty?
        return [0, 0]
      end

      if transformation&.match(/^matrix/)
        matrix = get_matrix_from_transform_matrix(transformation)
        get_translation_from_matrix(matrix)
      elsif transformation&.match(/^translate/)
        get_translation_from_transform_translate(transformation) || [0, 0]
      else
        [0, 0]
      end
    end

    # Cumulative translation from this element and all ancestors (for Indigo SVGs with nested <g>).
    def get_cumulative_transform_shift(element)
      total_x = 0.0
      total_y = 0.0
      node = element
      while node && node.name != 'svg'
        tx = get_internal_transform_shift(node)
        total_x += tx[0]
        total_y += tx[1]
        node = node.respond_to?(:parent) ? node.parent : nil
      end
      [total_x, total_y]
    end

    def remove_all_internal_transform
      [paths,circles].each do |node_set|
        node_set.each{|node| node["transform"]=""}
      end
    end

    def redefine_window_size
      svg=@svg.at_css("svg")
      svg["width"] = @width
      svg["height"] = @height
      svg["meetOrSlice"] = 'meet'
    end

    def centered_and_scaled_svg
      clean
      find_extrema
      mx = @margins[0] || 20
      my = @margins[1] || 20 # this value correlates to SVG text font as well
      # When SVG has both images and text (e.g. 2 polymers, one with label), add extra bottom
      # margin so the trim viewBox does not cut off the bottom (second image or label).
      has_images = @svg.xpath('//*[local-name()="image"]').any?
      has_text = @svg.xpath('//*[local-name()="text"]').any?
      my_bottom = (has_images && has_text) ? (my + 14) : my
      if (@min+@max).compact.size == 4
        x1,y1=*@min
        x2,y2=*@max
        @svg.at_css("svg")["viewBox"]='%i %i %i %i' % [0, 0, x2-x1 + mx, y2-y1 + my_bottom]
        @svg.at_css("svg")["width"]= x2-x1
        @svg.at_css("svg")["height"]=y2-y1
        children = @svg.at_css("svg").children
        @svg.at_css("svg").children.first.add_previous_sibling "<g transform='translate(#{(-x1+mx/2).round}, #{(-y1+my_bottom/2).round})'>"
        first_child = @svg.at_css("svg").children.first
        children.each do |n|
          n.parent = first_child
        end
      end
      redefine_window_size if @width && @height
      to_xml
    end
    
    def path_extrema(ind=nil)
      if ind
        splitxy_for_path(ind)
        minmax
        return [@min,@max]
      end
      paths.each do |element|
        coordinates = splitxy_for_path(element["d"])
        sx, sy = get_cumulative_transform_shift(element)
        coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
        minmax(coordinates)
      end
    end

    def text_extrema
      texts.each do |element|
        style = element["style"].to_s
        next if style.match(/display:\s*none/)
        coordinates = splitxy_for_text(element)
        sx, sy = get_cumulative_transform_shift(element)
        coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
        minmax(coordinates)
      end
    end

    # Returns positions of text elements matching R# (R1, R2, ...), R#, or A alone.
    # Sorted by vertical position (top to bottom). Used for polymer shape placement.
    def extract_r_or_a_positions
      found = []
      texts.each do |element|
        style = element["style"].to_s
        next if style.match(/display:\s*none/)
        text_content = ""
        if element.xpath('.//*[local-name()="tspan"]').any?
          element.xpath('.//*[local-name()="tspan"]').each { |tspan| text_content += tspan.content.to_s }
        else
          text_content = element.content.to_s
        end
        text_content = text_content.to_s.strip
        # Match R1, R#, R, A; allow optional space (e.g. Indigo "R 1", "R #", "R")
        next unless text_content.match?(/\A\s*(R\s*\d+|R\s*#|R|A)\s*\z/)
        coords = splitxy_for_text(element)
        sx, sy = get_cumulative_transform_shift(element)
        x = coords[0][0].to_f + sx
        y = coords[0][1].to_f + sy
        found << { x: x, y: y, element: element }
      end
      found.sort_by { |h| h[:y] }
    end

    def circle_extrema
      circles.each do |element|
        style = element["style"].to_s
        next if style.match(/display:\s*none/)
        coordinates = splitxy_for_circle(element)
        sx, sy = get_cumulative_transform_shift(element)
        coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
        minmax(coordinates)
      end
    end

    def viewbox
      @viewbox = @svg.at_css("svg")["viewbox"]
    end

    def preserve_aspect_ratio(t="xMinYMin")
      @svg.at_css("svg")["preserveAspectRatio"]=t
      self
    end

    def to_xml
      @svg.to_xml
    end

    private

    def get_translation_from_transform_translate(transformation)
      # Allow optional whitespace (Indigo uses "translate(x,y)" without space after "(")
      m = transformation.match(/translate\s*\(\s*([-+]?\d+\.?\d*)\s*(?:,\s*([-+]?\d+\.?\d*))?\s*\)/)
      return nil unless m && m[1]
      x = m[1].to_f
      y = m[2] ? m[2].to_f : x
      [x, y]
    end

    def get_matrix_from_transform_matrix(transform_matrix)
      transform_matrix.match(/matrix\(([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*,([-+]?\d+\.?\d*)\s*,([-+]?\d+\.?\d*)\s*,([-+]?\d+\.?\d*)\s*,([-+]?\d+\.?\d*)\s*\)/)
       [$1.to_f, $2.to_f, $3.to_f, $4.to_f, $5.to_f, $6.to_f ]
    end

    def get_translation_from_matrix(matrix)
      # only valid if a,b,c,d = 1,0,0,1
      [matrix[4],matrix[5]]
    end

    def minmax(d=@d)
      d&&d.each do |xy|
        mini(xy)
        maxi(xy)
      end
    end

    def mini(new_value)
      x,y = *new_value
      x0,y0 = *@min
      @min=[ x <= (x0||x) && x || x0, y <= (y0||y) && y || y0]
    end

    def maxi(new_value)
      x,y = *new_value
      x0,y0 = *@max
      @max=[ x >= (x0||x) && x || x0, y >= (y0||y) && y || y0]
    end

    def splitxy_for_text(text)
      # Get actual text content - check tspan children first, then direct content (namespace-agnostic)
      text_content = ""
      if text.xpath('.//*[local-name()="tspan"]').any?
        text.xpath('.//*[local-name()="tspan"]').each do |tspan|
          text_content += tspan.content.to_s
        end
      else
        text_content = text.content.to_s
      end
      
      # Position: prefer text element x,y; fallback to first tspan (Indigo may put x,y on tspan)
      base_x = text["x"].to_f
      base_y = text["y"].to_f
      if base_x == 0.0 && base_y == 0.0 && text.xpath('.//*[local-name()="tspan"]').any?
        first_tspan = text.xpath('.//*[local-name()="tspan"]').first
        base_x = (first_tspan["x"] || first_tspan["dx"])&.to_f || 0.0
        base_y = (first_tspan["y"] || first_tspan["dy"])&.to_f || 0.0
      end
      
      # If text length is 3 or less, use old simple logic
      if text_content.length <= 3
        font = (text["font"].to_s.match(/(\d+\.?\d*)px/) && $1).to_f
        font = (text["font-size"].to_s.match(/(\d+\.?\d*)/) && $1).to_f if font <= 0
        l = text_content.length
        return [[base_x, base_y], [base_x + font * l, base_y + font]]
      end
      
      # For longer strings (>3 chars), use logic with text-anchor positioning
      calculate_long_text_bounds(text, text_content, base_x, base_y)
    end

    # Calculates bounding box coordinates for text elements longer than 3 characters
    # This method handles text-anchor positioning and provides more accurate width calculation
    #
    # @param text [Nokogiri::XML::Element] The text SVG element
    # @param text_content [String] The actual text content (already extracted)
    # @param base_x [Float] Optional x position (from text or first tspan)
    # @param base_y [Float] Optional y position (from text or first tspan)
    # @return [Array<Array<Float>>] Array of two coordinate pairs: [[x_start, y], [x_end, y + font]]
    def calculate_long_text_bounds(text, text_content, base_x = nil, base_y = nil)
      # Extract x and y coordinates from the text element (or use passed-in base)
      x = base_x.nil? ? text["x"].to_f : base_x
      y = base_y.nil? ? text["y"].to_f : base_y
      
      # Get font size from font attribute or font-size attribute
      # Priority: font attribute (e.g., "24px Arial") > font-size attribute > old extraction method
      font = if text["font"] && text["font"].match(/(\d+\.?\d*)px/)
               text["font"].match(/(\d+\.?\d*)px/)[1].to_f
             elsif text["font-size"] && text["font-size"].match(/(\d+\.?\d*)/)
               text["font-size"].match(/(\d+\.?\d*)/)[1].to_f
             else
               # Use old extraction method as fallback
               (text["font"].match(/(\d+\.?\d*)px/) && $1).to_f
             end
      
      # Calculate text width more accurately
      # Formula: font_size * character_count * 0.6
      # The 0.6 multiplier accounts for average character width in most fonts
      # (most characters are narrower than the font size)
      text_width = font * text_content.length * 0.6
      
      # Account for text-anchor positioning
      # text-anchor determines how the text is aligned relative to the x coordinate
      text_anchor = text["text-anchor"] || "start"
      case text_anchor
      when "middle"
        # Text is centered: x is the middle point
        x_start = x - (text_width / 2)
        x_end = x + (text_width / 2)
      when "end"
        # Text ends at x: x is the right edge
        x_start = x - text_width
        x_end = x
      else # "start" or default
        # Text starts at x: x is the left edge (default behavior)
        x_start = x
        x_end = x + text_width
      end
      
      # Return bounding box coordinates
      # Text height is approximately the font size
      [[x_start, y], [x_end, y + font]]
    end

    def splitxy_for_circle(circle)
      cx,cy,r=circle["cx"].to_f,circle["cy"].to_f,circle["r"].to_f
      [[cx-r,cy-r],[cx+r,cy+r]]
    end

    def splitxy_for_path(d="",origin=[0,0])
      splitted=[]
      d&.match(/\s*([mlhvzMLHVZ])/) && (command,data=$1,$')
      while data!=""
        case command
        when "M"
          data.match(/([-+]?\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*/) && (origin,data = [$1.to_f,$2.to_f],$') && splitted<<origin
        when "m"
          data.match(/[-+]?(\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*/) && (origin,data = [origin[0]+$1.to_f,origin[1]+$2.to_f],$') && splitted<<origin
        when "L"
          data.match(/[-+]?(\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*/) &&  (origin,data = [$1.to_f,$2.to_f],$') && splitted<<origin
        when "l"
          data.match(/[-+]?(\d+\.?\d*)\s*,\s*([-+]?\d+\.?\d*)\s*/) && (origin,data = [origin[0]+$1.to_f,origin[1]+$2.to_f],$') && splitted<<origin
        when "H"
          data.match(/[-+]?(\d+\.?\d*)\s*,?\s*/) && (origin,data = [$1.to_f,origin[1]],$') && splitted<<origin
          data.match(/[-+]?(\d+\.?\d*)\s*,?\s*/) && (origin,data = [$1.to_f+origin[0],origin[1]],$') && splitted<<origin
        when "V"
          data.match(/[-+]?(\d+\.?\d*)\s*,?\s*/) && (origin,data = [origin[0],$1.to_f],$') && splitted<<origin
        when "v"
        when "h"
          data.match(/[-+]?(\d+\.?\d*)\s*,?\s*/) && (origin,data = [origin[0],$1.to_f+origin[1]],$') && splitted<<origin
        when "Z"
        when "z"
        #todo cubic bezier https://www.w3.org/TR/SVG/paths.html#PathData
        when "s"
        when "S"
        when "c"
        when "C"
        end
        if data
          data&.match(/\s*([mlhvzscMLHVZSC])/) && (command,data=$1,$') || (data="")
        else
          data=""
        end
      end
      splitted
    end

  end
  # rubocop:enable all
end
