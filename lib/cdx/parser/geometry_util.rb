# frozen_string_literal: true

module Cdx
  module Parser
    # Helper for Geometry
    module GeometryUtil
      def segment_to_line(segment)
        Geometry::Line.new(segment.point1, segment.point2)
      end

      def x_from_y_along(segment, ym)
        p1 = segment.point1
        p2 = segment.point2
        a = (p1.y - ym) * (p1.x - p2.x)
        b = p1.y - p2.y

        b.zero? ? nil : (p1.x - (a / b))
      end

      def y_from_x_along(segment, xm)
        p1 = segment.point1
        p2 = segment.point2
        a = (p1.x - xm) * (p1.y - p2.y)
        b = p1.x - p2.x

        b.zero? ? nil : (p1.y - (a / b))
      end

      def line_to_segment(line)
        Geometry::Segment.new(line.point1, line.point2)
      end

      def line_intersects_with_segment?(line, segment)
        lseg = line_to_segment(line)
        yp0 = y_from_x_along(lseg, 0)
        xp0 = x_from_y_along(lseg, -1_000_000)
        ypinf = y_from_x_along(lseg, 1_000_000)
        xpinf = x_from_y_along(lseg, 1_000_000)

        p0 = if yp0.nil?
               Geometry::Point.new(xp0, -1_000_000)
             else
               Geometry::Point.new(0, yp0)
             end

        pinf = if ypinf.nil?
                 Geometry::Point.new(xpinf, 1_000_000)
               else
                 Geometry::Point.new(1_000_000, ypinf)
               end
        inf_segment = Geometry::Segment.new(p0, pinf)

        segment.intersects_with?(inf_segment)
      end

      def polygon_intersects_with_line?(polygon, line)
        box = box_polygon(polygon)
        box.edges.each do |edge|
          return true if line_intersects_with_segment?(line, edge)
        end

        false
      end

      def polygon_intersects_with_segment?(polygon, segment)
        polygon.edges.each do |edge|
          return true if edge.intersects_with?(segment)
        end

        false
      end

      def polygon_intersects_with_polygon?(p1, p2)
        p1.edges.each do |e1|
          p2.edges.each  do |e2|
            return true if e1.intersects_with?(e2)
          end
        end

        false
      end

      def polygon_contains_polygon?(inside, container)
        inside.vertices.each do |v1|
          return false unless container.contains?(v1)
        end

        true
      end

      def polygon_around_arrow?(polygon, arrow)
        box = box_polygon(polygon)
        apolygon = polygon_arrow(arrow)

        check = polygon_intersects_with_polygon?(box, apolygon)
        return true if check

        check = polygon_contains_polygon?(box, apolygon) ||
                polygon_contains_polygon?(apolygon, box)
        check
      end

      def arrow_equation(arrow)
        a, b, = line_params_from_arrow(arrow)
        l = segment_from_arrow(arrow).length / 2

        [a, b, l]
      end

      def polygon_arrow(arrow)
        a, b, l = arrow_equation(arrow)

        head = Geometry::Point.new(arrow[:head][:x], arrow[:head][:y])
        tail = Geometry::Point.new(arrow[:tail][:x], arrow[:tail][:y])
        uphead, lowhead = perpen_points(head, a, b, l)
        uptail, lowtail = perpen_points(tail, a, b, l)

        Geometry::Polygon.new([uphead, lowhead, lowtail, uptail])
      end

      def box_polygon(polygon)
        box = polygon.bounding_box
        rt = box.righttop
        lb = box.leftbottom

        points = []
        points << Geometry::Point.new(rt.x, rt.y)
        points << Geometry::Point.new(rt.x, lb.y)
        points << Geometry::Point.new(lb.x, lb.y)
        points << Geometry::Point.new(lb.x, rt.y)

        Geometry::Polygon.new(points)
      end

      def center_points(arrow)
        a, b, l = arrow_equation(arrow)
        perpen_points(arrow[:center], a, b, l)
      end

      def perpen_points(point, a, b, l)
        # perpendicular line will be: Bx - Ay + C = 0
        # Solve these 2 equations to get the point
        #   (x - x0)**2 + (y - y0)**2 = l**2 (1)
        #   B(x - x0) - A(y - y0) = 0 (2)
        m = (((a**2) * (l**2)) / (b**2 + a**2)).round(4)
        k = (l**2 - m).round(4)

        x1 = point.x + Math.sqrt(m)
        x2 = point.x - Math.sqrt(m)

        y1 = point.y + Math.sqrt(k)
        y2 = point.y - Math.sqrt(k)

        p1 = Geometry::Point.new(x1, y1)
        p2 = Geometry::Point.new(x2, y2)

        [p1, p2]

        # [upper_point(m, point, l), lower_point(m, point, l)]
      end

      # def upper_point(m, center, l)
      #   x = center.x + Math.sqrt(m)
      #   k = (l**2 - (x - center.x)**2).abs
      #   y = Math.sqrt(k) + center.y

      #   Geometry::Point.new(x, y)
      # end

      # def lower_point(m, center, l)
      #   x = center.x - Math.sqrt(m)
      #   k = (l**2 - (x - center.x)**2).abs
      #   y = (Math.sqrt(k) - center.y).abs

      #   Geometry::Point.new(x, y)
      # end

      # Line: Ax + By + C = 0
      def line_params_from_arrow(arrow)
        x1 = arrow[:head][:x]
        x2 = arrow[:tail][:x]
        y1 = arrow[:head][:y]
        y2 = arrow[:tail][:y]

        a = y1 - y2
        b = x2 - x1
        c = x1 * y2 - x2 * y1

        [a, b, c]
      end

      def extend_arrow_to_max(arrow_id)
        arrow = @arrowmap[arrow_id]
        a1, b1, c1 = line_params_from_arrow(arrow)

        xmax = arrow[:head][:x]
        ymax = arrow[:head][:y]
        xmin = arrow[:tail][:x]
        ymin = arrow[:tail][:y]

        @arrowmap.each do |k, v|
          next if k == arrow_id
          a2, b2, c2 = line_params_from_arrow(v)
          d = a1 * b2 - a2 * b1

          if d.zero?
            # parallel arrow
            tx = v[:tail][:x]
            ty = v[:tail][:y]
            if tx > xmax || ty > ymax
              xmax = tx
              ymax = ty
            end
            next
          end

          dx = c1 * b2 - b1 * c2
          dy = a1 * b2 - b1 * a2
          x = dx / d
          y = dy / d

          if x > xmax || y > ymax
            xmax = x
            ymax = y
          elsif x < xmin || y < ymin
            xmin = x
            ymin = y
          end
        end

        Geometry::Segment.new_by_arrays([xmax, ymax], [xmin, ymin])
      end
    end
  end
end
