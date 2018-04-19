# frozen_string_literal: true

module Cdx
  module Parser
    # Utilities for Refining
    module RefineUtil
      include Base
      include PositionUtil

      def reaction_arrow_list
        if @is_ignore
          @arrowmap.keys
        else
          @reactionmap.values.map { |r| r[:arrow] }.compact
        end
      end

      def molecule?(mol)
        return false if mol.class != OpenBabel::OBMol || mol.num_atoms.zero?
        return true if mol.num_atoms > 1

        atom = mol.get_atom(1)
        atnum = atom.get_atomic_num
        return false if atnum.zero? || (atnum == 6 && atom.has_data('Alias'))

        true
      end

      def add_mol_to_react(reaction, mol, arrow)
        group = detect_position(mol, arrow)
        reaction[group.to_sym] << mol
      end

      def map_reaction_by_id(ids)
        react = {}
        %w[reactants reagents products].each do |group|
          next if ids[group.to_sym].nil?
          gsym = group.to_sym

          react[gsym] = []
          ids[gsym].each do |mid|
            obj = lookup_id(mid)
            no_push = obj.nil? || obj[:text]&.strip == '+'
            react[gsym].push(obj) unless no_push
          end
        end
        react
      end

      def extend_arrow(head, tail)
        return if @arrowmap.count.zero?

        min = { key: 0, val: 9_999_999 }

        @arrowmap.each do |key, value|
          dist = Geometry.distance(head, value[:center])
          min = { key: key, val: dist } if min[:val] > dist
          rid = reaction_id_from_arrow(key)
          value[:reaction_id] = rid unless rid.nil?
        end

        @arrowmap[min[:key]][:tail] = { x: tail.x, y: tail.y }
      end

      def remove_from_reactionmap(id)
        @reactionmap.each_value do |v|
          %w[reactants reagents products].each do |group|
            v[group.to_sym]&.delete_if { |x| x == id }
          end
        end
      end

      def move_mol_to_text(id, obj)
        atom = obj[:mol].get_atom(1)
        return unless atom.has_data('Alias')

        x = atom.get_x
        y = atom.get_y
        center = Geometry::Point.new(x, y)
        content = atom.get_data('Alias').get_value.split('$$$$')
        return if content.count.zero?

        text = content.first
        coords = content.last.split(',')
        lb = coords.first.split('-').map(&:to_f)
        rt = coords.last.split('-').map(&:to_f)
        lbp = Geometry::Point.new(lb.first, lb.last)
        ltp = Geometry::Point.new(lb.first, rt.last)
        rtp = Geometry::Point.new(rt.first, rt.last)
        rbp = Geometry::Point.new(rt.first, lb.last)

        @textmap[id] = {
          text: text,
          polygon: Geometry::Polygon.new([lbp, ltp, rtp, rbp]),
          center: center
        }
      end

      def all_unused
        res = @molmap.select { |_, v| v[:added].nil? }
        unused_text = @textmap&.select { |_, v| v[:added].nil? && v[:text].strip != '+' }
        res.merge!(unused_text)

        res
      end

      def reaction_id_from_arrow(id)
        res = @reactionmap.find { |_, v| v[:arrow] == id }
        return nil if res.nil?
        res.first
      end

      def refine_reaction_group
        @reaction.each do |v|
          %w[reactants products].each do |group|
            add_text_to_mol(v[group.to_sym])
          end
        end

        @reaction.delete_if { |x| invalid_reaction?(x) }
      end

      def add_text_to_mol(group)
        return if group.nil?

        list_mol = []
        list_text = []

        group.each_with_index do |obj, id|
          unless obj[:mol].nil?
            list_mol.push(id: id, obj: obj)
            next
          end

          list_text.push(id: id, obj: obj) unless obj[:text].nil?
        end

        return if list_mol.empty? || list_text.empty?

        ids = []
        list_text.each do |text_obj|
          tobj = text_obj[:obj]

          min_id = list_mol.first[:id]
          min = 10_000_000
          list_mol.each do |m|
            tcenter = tobj[:center]
            mcenter = m[:obj][:center]
            dist = Geometry.distance(tcenter, mcenter)
            if min > dist
              min = dist
              min_id = m[:id]
            end
          end

          mol = list_mol[min_id][:obj]
          mol[:text] = '' if mol[:text].nil?
          delim = mol[:text].empty? ? '' : ';'
          mol[:text] += delim + tobj[:text]
          ids << text_obj[:id]
        end

        ids.sort.uniq.each_with_index do |idx, id|
          group.delete_at(idx - id)
        end
      end
    end
  end
end
