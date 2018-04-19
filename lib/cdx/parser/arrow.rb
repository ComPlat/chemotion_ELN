# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Geometry parser
    module Arrow
      include Base

      # First written/read in:	ChemDraw 8.0
      def do_geometry(cdxr, cid)
        while (tag = cdxr.read_next).positive?
          next unless [CDX_PROP_3DHEAD, CDX_PROP_3DTAIL].include?(tag)
          data = cdxr.data
          x = read_int32(data) * 1.0e-6
          y = read_int32(data) * 1.0e-6
          if tag == CDX_PROP_3DTAIL
            tail = { x: x, y: y }
          else
            head = { x: x, y: y }
          end
        end
        add_to_arrowmap(cid, tail, head)
      end

      def do_xml_geometry(node, nid)
        tail = {}
        head = {}

        node.attributes.each do |key, value|
          next unless %w[Head3D Tail3D].include?(key)
          value_arr = value.text.split(' ')
          x = value_arr[0].to_f
          y = value_arr[1].to_f

          if key == 'Tail3D'
            tail = { x: x, y: y }
          else
            head = { x: x, y: y }
          end
        end

        add_to_arrowmap(nid, tail, head)
      end

      def add_to_arrowmap(cid, tail, head)
        center = Geometry::Point.new(
          (tail[:x] + head[:x]) / 2,
          (tail[:y] + head[:y]) / 2
        )
        @arrowmap[cid] = {} if @arrowmap[cid].nil?
        @arrowmap[cid].merge!(tail: tail, head: head, center: center)
      end
    end
  end
end
