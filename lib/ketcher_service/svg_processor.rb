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
      @paths = @svg.css("//path")
    end

    def circles
      @circles = @svg.css("//circle")
    end

    def texts
      @texts = @svg.css("//text")
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
      self
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
        get_translation_from_transform_translate(transformation)
      end
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
      if (@min+@max).compact.size == 4
        x1,y1=*@min
        x2,y2=*@max
        @svg.at_css("svg")["viewBox"]='%i %i %i %i' % [0, 0, x2-x1 + mx,y2-y1 + my]
        @svg.at_css("svg")["width"]= x2-x1
        @svg.at_css("svg")["height"]=y2-y1
        children = @svg.at_css("svg").children
        @svg.at_css("svg").children.first.add_previous_sibling "<g transform='translate(#{(-x1+mx/2).round}, #{(-y1+my/2).round})'>"
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
        sx,sy = *get_internal_transform_shift(element)
        coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
        minmax(coordinates)
      end
    end

    def text_extrema
      texts.each do |element|
        if !element["style"].match(/display:\s*none/)
          coordinates = splitxy_for_text(element)
          sx,sy = *get_internal_transform_shift(element)
          coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
          minmax(coordinates)
        end
      end
    end

    def circle_extrema
      circles.each do |element|
        if !element["style"].match(/display:\s*none/)
          coordinates = splitxy_for_circle(element)
          sx,sy = *get_internal_transform_shift(element)
          coordinates.map!{|xy| x,y = *xy; [x+sx,y+sy]}
          minmax(coordinates)
        end
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
      transformation.match(/translate\( ([-+]?\d+\.?\d*)\s*(,\s*([-+]?\d+\.?\d*))?\)/)
      translation =[$1.to_f,$1.to_f] if $1
      translation[1]=$3.to_f if $3
      tranlation||=nil
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
      x,y = text["x"].to_f, text["y"].to_f
      # Get font size from font attribute or font-size attribute
      font = if text["font"] && text["font"].match(/(\d+\.?\d*)px/)
               text["font"].match(/(\d+\.?\d*)px/)[1].to_f
             elsif text["font-size"] && text["font-size"].match(/(\d+\.?\d*)/)
               text["font-size"].match(/(\d+\.?\d*)/)[1].to_f
             else
               24.0 # default font size
             end
      
      # Get actual text content - check tspan children first, then direct content
      text_content = ""
      if text.css('tspan').any?
        text.css('tspan').each do |tspan|
          text_content += tspan.content.to_s
        end
      else
        text_content = text.content.to_s
      end
      
      # Calculate text width more accurately (approximate: font_size * character_count * 0.6)
      # This accounts for average character width in most fonts
      text_width = font * text_content.length * 0.6
      
      # Account for text-anchor positioning
      text_anchor = text["text-anchor"] || "start"
      case text_anchor
      when "middle"
        x_start = x - (text_width / 2)
        x_end = x + (text_width / 2)
      when "end"
        x_start = x - text_width
        x_end = x
      else # "start" or default
        x_start = x
        x_end = x + text_width
      end
      
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
