# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Text parser
    module Text
      include Base

      def do_text(cdxr, cid = nil)
        text = ''
        warning = false
        while (tag = cdxr.read_next).positive?
          data = cdxr.data
          case tag
          when CDX_PROP_TEXT
            style_runs = read_int16(data) * 10
            text = data[style_runs, data.size - style_runs]
          when CDX_PROP_2DPOSITION
            y = read_int32(data)
            x = read_int32(data)
          when CDX_PROP_BOUNDINGBOX then polygon = polygon_boundingbox(data)
          when CDX_PROP_CHEMICALWARNING
            warning = true
            warning_data = data
          else
            do_unhandled(cdxr, tag)
          end
        end

        add_to_textmap(cid, text, x * 1.0e-6, y * 1.0e-6, polygon)
        unicode_text = text.force_encoding(Encoding::CP1252).encode(Encoding::UTF_8)
        {
          text: unicode_text,
          warning: warning,
          polygon: polygon,
          warning_data: warning_data
        }
      end

      def do_xml_text(node, nid = nil)
        warning = false
        polygon = nil
        warning_data = ''
        x = 0
        y = 0

        node.attributes.each do |key, value|
          case key
          when 'p'
            value_arr = value.text.split(' ')
            x = value_arr[0].to_f
            y = value_arr[1].to_f
          when 'BoundingBox' then polygon = xml_polygon_boundingbox(value)
          when 'Warning'
            warning = true
            warning_data = value.text
          end
        end

        add_to_textmap(nid, node.text, x, y, polygon)
        {
          text: node.text,
          warning: warning,
          polygon: polygon,
          warning_data: warning_data
        }
      end

      def add_to_textmap(cid, text, x, y, polygon)
        return if cid.nil?
        center = Geometry::Point.new(x, y)
        @textmap[cid] = {
          text: text,
          center: center,
          polygon: polygon,
          box: polygon.bounding_box
        }
      end
    end
  end
end
