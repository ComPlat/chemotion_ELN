# frozen_string_literal: true

module Cdx
  module Parser
    # Utilities for position detection
    module PositionUtil
      include GeometryUtil

      def line?(mol)
        return false if mol.num_atoms < 3

        points = []
        (1..mol.num_atoms).each do |i|
          point = point_from_atom(mol.get_atom(i))
          points << point
          next if i < 3
          seg1 = Geometry::Segment.new(points[i - 3], points[i - 2])
          seg2 = Geometry::Segment.new(points[i - 2], points[i - 1])
          return false unless seg1.lies_on_one_line_with?(seg2)
        end

        true
      end

      def detect_reaction_arrow_id(value, arrow_list)
        center = value[:center]
        return if center.nil?

        min_id = arrow_list.first
        min = 10_000_000

        arrow_list.each do |id|
          arrow = @arrowmap[id]
          acenter = arrow[:center]
          next unless acenter
          dist = Geometry.distance(center, acenter)
          if min > dist
            min = dist
            min_id = id
          end
        end

        min_id
      end

      def detect_position(mol, arrow)
        is_around = polygon_around_arrow?(mol[:polygon], arrow)
        return 'reagents' if is_around

        acenter = arrow[:center]
        upper, = center_points(arrow)

        pside = side_value(mol[:center], acenter, upper)

        ahead_point = Geometry::Point.new(arrow[:head][:x], arrow[:head][:y])
        head_side = side_value(ahead_point, acenter, upper)

        (pside * head_side).positive? ? 'products' : 'reactants'
      end

      def side_value(point, pvector1, pvector2)
        a = (point.x - pvector1.x) * (pvector2.y - pvector1.y)
        b = (point.y - pvector1.y) * (pvector2.x - pvector1.x)

        a - b
      end
    end
  end
end
