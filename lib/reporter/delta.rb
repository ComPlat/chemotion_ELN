require 'cgi'

module Reporter
  # Delta class to convert Quill delta format to HTML
  class Delta
    attr_reader :delta, :html

    # Initialize the Delta class with a delta and optional font font_family
    # @param delta_input [Hash, Nil] The delta to be converted
    # @param font_family [String, Nil] The font family to be used in the HTML
    def initialize(delta_input, font_family = nil)
      @delta = delta_input.presence || {}
      @font_family = font_family
    end

    def getHTML
      deltaToHTML(@delta)
    end

    private
    def deltaToHTML(delta)
      return "" if delta['ops'].blank?

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

      # Emit the block elements (<p>/<ol>/<ul>/<hN>) directly. They are valid
      # children of sablon's top-level document fragment. A wrapping <div>
      # would be parsed as a single paragraph that may not contain block
      # children (sablon >= 0.4.3 raises "p is not a valid child of div").
      html.join("")
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
      return CGI.escapeHTML(op["insert"].to_s) if (!op["attributes"]) && (!(op && op["insert"].is_a?(Hash) && op["insert"]["image"]))

      styles = []
      tags = []

      if (op && op["insert"].is_a?(Hash) && op["insert"]["image"])
        styles << "color:red"
        styles << "font-weight:bold"
        return "<i><span style=\"#{styles.join(";")}\">(Image is not supported in this version)</span></i>"
      end

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
          # Quill encodes superscript as script: "super", but "super" is not a
          # valid HTML tag; the correct element is <sup>. sablon >= 0.4.3 rejects
          # unregistered tags (ArgumentError "Don't know how to handle HTML tag:
          # super"), so map "super" to "sup" while "sub" is already valid.
          tags += [value == "super" ? "sup" : value]
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
      html = "<span#{style}>#{CGI.escapeHTML(op["insert"].to_s)}</span>"

      tags.each { |tag| html = "<#{tag}>#{html}</#{tag}>" }
      html
    end
  end
end
