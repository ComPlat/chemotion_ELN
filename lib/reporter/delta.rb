module Reporter
  class Delta
    attr_reader :delta, :html

    def initialize(d, font_family = nil)
      @delta = d
      @font_family = font_family
    end

    def getHTML
      deltaToHTML(@delta)
    end

    private
    def deltaToHTML(delta)
      return "<div></div>" if delta["ops"].count == 0

      html = []
      i = 0
      loop do
        op = delta["ops"][i]
        next_op = i < delta["ops"].count ? delta["ops"][i + 1] : nil

        op_html = buildDeltaOps(op)
        wrapper = buildNextOp(op_html, next_op)

        if wrapper
          i = i + 1
          html << wrapper
        else
          html << op_html
        end

        i = i + 1

        break if i > delta["ops"].count - 1
      end

      html = html.join("").split("\n").map { |k, i|
        if (["<!!!olli!!!>", "<!!!ulli!!!>"].any? { |tag| k.include?(tag) } ||
            (/^<h\d>.*<\/h\d>/ =~ k))
          k
        elsif k === ""
          "<p><br /></p>"
        elsif @font_family
          "<p><span style=\"font-family: #{@font_family}\">#{k}</span></p>"
        else
          "<p>#{k}</p>"
        end
      }

      html = rebuildList(html, "!!!olli!!!", "ol")
      html = rebuildList(html, "!!!ulli!!!", "ul")

      "<div>" + html.join("") + "</div>"
    end

    def rebuildList html, string, replace_string
      rebuild_html = []
      list = false

      html.each do |tag|
        if (/^<#{string}>.*<\/#{string}>/ =~ tag)
          if !list
            rebuild_html << "<#{replace_string}>"
            list = true
          end
          tag.gsub! string, "li"
        else
          if list
            rebuild_html << "</#{replace_string}>"
            list = false
          end
        end

        rebuild_html << tag
      end

      rebuild_html
    end

    def buildNextOp(html, next_op)
      return nil if !next_op || !next_op["attributes"]

      tag = false
      case next_op["attributes"].keys.first.to_s
      when "header"
        tag = "h#{next_op["attributes"]["header"].to_s}"
      when "list"
        if next_op["attributes"]["list"] == "ordered"
          tag = "!!!olli!!!"
        elsif next_op["attributes"]["list"] == "bullet"
          tag = "!!!ulli!!!"
        end
      end

      if tag
        html =
          if html.include? "\n"
            html.reverse.sub(/\n+/){ |s| "#{s.reverse}<#{tag}>".reverse }.reverse
          else
            "<#{tag}>#{html}"
          end

        op_html = "#{html}</#{tag}>\n"
      end

      op_html
    end

    def buildDeltaOps(op)
      return op["insert"] if (!op["attributes"])

      styles = []
      tags = []

      (op["attributes"].keys || []).each do |html_attr|
        value = op["attributes"][html_attr].to_s

        case html_attr
        when "bold"
          tags += ["b"] if value == "true"
        when "underline"
          tags += ["u"] if value == "true"
        when "italic"
          tags += ["i"] if value == "true"
        when "script"
          tags += [value]
        when "color"
          styles << "color: #{value}"
        when "background"
          styles << "background-color: #{value}"
        when "font-family"
          styles << "font-family: #{value}"
        when "font-size"
          styles << "font-size: #{value}"
        end
      end

      html_with_tags_style(op, tags, styles)
    end

    def html_with_tags_style(op, tags, styles)
      style = styles.count > 0 ? " style=\"#{styles.join(";")}\"" : ""
      html = "<span#{style}>#{op["insert"]}</span>"

      tags.each { |tag| html = "<#{tag}>#{html}</#{tag}>" }
      html
    end
  end
end
