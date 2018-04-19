# frozen_string_literal: true

module Cdx
  module Parser
    # CDX parser base
    module Base
      require 'geometry'

      include Header

      # Don't rely on Reaction Step/Scheme with this ChemDraw version
      IGNORE_VERSION = '8.0'

      def initialize
        @tempid = 10_000_000
        @cdxr = nil
        @reaction = []
        # @toplvmap = {}
        @molmap = {}
        @arrowmap = {}
        @graphicmap = {}
        @ext_arrowmap = {}
        @reactionmap = {}
        @textmap = {}
        @groupmap = {}
        @temp_removed = {}
        @obabel = OpenBabel::OBConversion.new
      end

      def do_unhandled(cdxr, tag)
        return unless (tag & CDX_TAG_OBJECT).nonzero?
        loop { break if cdxr.read_next.positive? }
      end

      def read_int8(buffer)
        buf = buffer.slice!(0, 1)
        buf.unpack('c*')[0]
      end

      def read_int16(buffer)
        buf = buffer.slice!(0, 2)
        buf.unpack('s*')[0]
      end

      def read_int32(buffer)
        buf = buffer.slice!(0, 4)
        buf.unpack('l*')[0]
      end

      def read_uint16(buffer)
        buf = buffer.slice!(0, 2)
        buf.unpack('S*')[0]
      end

      def read_uint32(buffer)
        buf = buffer.slice!(0, 4)
        buf.unpack('L*')[0]
      end

      def lookup_mol(id)
        @molmap[id] ? @molmap[id] : @textmap[id]
      end

      def lookup_id(id)
        return lookup_mol(id) if @groupmap[id].nil?
        @groupmap[id].each do |gid| lookup_id(gid) end
        nil
      end

      def polygon_boundingbox(data)
        top = read_int32(data) * 1.0e-6
        left = read_int32(data) * 1.0e-6
        bottom = read_int32(data) * 1.0e-6
        right = read_int32(data) * 1.0e-6

        lb = Geometry::Point.new(left, bottom)
        lt = Geometry::Point.new(left, top)
        tr = Geometry::Point.new(right, top)
        tb = Geometry::Point.new(right, bottom)

        Geometry::Polygon.new([lb, lt, tr, tb])
      end

      def xml_polygon_boundingbox(value)
        value_arr = value.text.split(' ')
        left = value_arr[0].to_f
        top = value_arr[1].to_f
        right = value_arr[2].to_f
        bottom = value_arr[3].to_f

        lb = Geometry::Point.new(left, bottom)
        lt = Geometry::Point.new(left, top)
        tr = Geometry::Point.new(right, top)
        tb = Geometry::Point.new(right, bottom)

        Geometry::Polygon.new([lb, lt, tr, tb])
      end

      def read_boundingbox(data)
        polygon_boundingbox(data).bounding_box
      end

      def xml_read_boundingbox(value)
        xml_polygon_boundingbox(value).bounding_box
      end

      def arrow_from_box(box)
        lb = box.leftbottom
        rt = box.righttop
        {
          head: { x: rt.x, y: rt.y },
          tail: { x: lb.x, y: lb.y }
        }
      end

      def vector_from_arrow(arrow)
        segment_from_arrow(arrow).to_vector
      end

      def segment_from_arrow(arrow)
        Geometry::Segment.new_by_arrays(
          [arrow[:tail][:x], arrow[:tail][:y]],
          [arrow[:head][:x], arrow[:head][:y]]
        )
      end

      def line_from_arrow(arrow)
        Geometry::Line.new_by_arrays(
          [arrow[:tail][:x], arrow[:tail][:y]],
          [arrow[:head][:x], arrow[:head][:y]]
        )
      end

      def bb_center(box)
        x = (box.leftbottom.x + box.righttop.x) / 2
        y = (box.leftbottom.y + box.righttop.y) / 2
        Geometry::Point.new(x, y)
      end

      def molecule_polygon(mol)
        points = []
        1.upto(mol.num_atoms) do |idx|
          points << point_from_atom(mol.get_atom(idx))
        end
        Geometry::Polygon.new(points)
      end

      def point_from_atom(atom)
        vector = atom.get_vector
        Geometry::Point.new(vector.get_x, vector.get_y.abs)
      end

      def invalid_reaction?(reaction)
        (
          reaction[:reactants].nil? || reaction[:reactants].empty? ||
          reaction[:products].nil? || reaction[:products].empty?
        )
      end

      def molecule_output(mol, format)
        return '' if @obabel.nil?
        @obabel.set_out_format(format)
        @obabel.write_string(mol, true)
      end

      # def obj_box(mbox)
      #   return mbox[:box] unless mbox[:text]
      #   center = mbox[:center]
      #   point = OpenStruct.new(x: center.x, y: center.y)
      #   OpenStruct.new(righttop: point, leftbottom: point)
      # end
    end
  end
end
