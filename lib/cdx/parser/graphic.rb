# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Graphic parser
    module Graphic
      include Base

      # First written/read in:	ChemDraw 4.0
      def do_graphic(cdxr, cid)
        arrow_id = nil
        type = nil

        while (tag = cdxr.read_next).positive?
          data = cdxr.data
          case tag
          when CDX_PROP_ARROW_TYPE
            type = cdxr.len == 1 ? read_int8(data) : read_int16(data)
          when CDX_PROP_BOUNDINGBOX
            # Graphic objects are the only objects whose kCDXProp_BoundingBox
            # property has a special meaning, representing a pair of points
            # rather than a rectangle. The meaning of those two points in the
            # context of each graphic type is shown below
            box = read_boundingbox(data)
          when CDX_PROP_SUPERSEDEDBY then arrow_id = read_int32(data)
          end
        end

        process_arrow(type, box, arrow_id, cid)
      end

      def do_xml_graphic(node, nid)
        arrow_id = nil
        type = nil
        box = nil

        node.attributes.each do |key, value|
          case key
          when 'ArrowType'
            type = case value.text
                   when 'NoHead' then 0
                   when 'HalfHead' then 1
                   when 'FullHead' then 2
                   when 'Resonance' then 4
                   when 'Equilibrium' then 8
                   when 'Hollow' then 16
                   when 'RetroSynthetic' then 32
                   when 'NoGo' then 64
                   when 'Dipole' then 128
                   end
          when 'BoundingBox'
            # Graphic objects are the only objects whose kCDXProp_BoundingBox
            # property has a special meaning, representing a pair of points
            # rather than a rectangle. The meaning of those two points in the
            # context of each graphic type is shown below
            box = xml_read_boundingbox(value)
          when 'SupersededBy' then arrow_id = value.text.to_i
          end
        end

        process_arrow(type, box, arrow_id, nid)
      end

      def process_arrow(type, box, arrow_id, cid)
        headless = type.nil? || type == CDX_ARROWTYPE_NOHEAD
        return if headless

        if arrow_id.nil?
          aid = cid
        else
          aid = arrow_id
          @graphicmap[cid] = arrow_id
        end

        @arrowmap[aid] = {} if @arrowmap[aid].nil?
        @arrowmap[aid].merge!(read_arrow(type, box))

        return unless @is_ignore
        @reactionmap[@tempid] = { arrow: aid }
        @tempid += 1
      end

      def read_arrow(type, box)
        arrow = {}
        arrow[:type] = type unless type.nil?

        arrow[:box] = box
        arrow.merge!(arrow_from_box(box))
        arrow[:center] = bb_center(box)

        arrow
      end
    end
  end
end
