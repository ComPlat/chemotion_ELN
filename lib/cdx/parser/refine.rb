# frozen_string_literal: true

# Overrides Array class for sorted? method
class Array
  def sorted?
    each_cons(2).all? { |a, b| (a <=> b) <= 0 }
  end
end

module Cdx
  module Parser
    # CDX Graphic parser
    module Refine
      include RefineUtil

      def refine_data
        # First refine the molecules
        refine_molmap

        if @arrowmap.size == 1 && @reactionmap.size.zero? && @tempid > 10_000_000
          # ELN DOCX
          return refine_eln_reaction
        end

        # Extend the arrow based on the @ext_arrowmap
        refine_arrow

        # Molecules and text are processed, now adding to reaction properly
        refine_reaction

        true
      end

      # Check text within mol
      # Scan molmap and retrieve the coord from its atom
      # Detect if there are any "arrow" molecule, the one which
      # people drawing to be viewed as an arrow
      def refine_molmap
        @molmap.each do |key, val|
          # Sometime user add text as alias to a single molecule
          # These are considered as text
          unless molecule?(val[:mol])
            # Save removed key somewhere, not in used right now
            @temp_removed[key] = val

            move_mol_to_text(key, val)
            remove_from_reactionmap(key)
            @molmap[key] = nil
            next
          end

          val[:polygon] = molecule_polygon(val[:mol])
          val[:box] = val[:polygon].bounding_box
          val[:center] = bb_center(val[:box])

          # Check if user draw a molecule as an "extended" arrow
          next unless line?(val[:mol])
          @ext_arrowmap[key] = val
          @molmap[key] = nil
        end

        # - Remove key with nil value
        # - Remove atom which has no bond connected
        clean_molmap

        @molmap.each_value do |val|
          val[:smi] = molecule_output(val[:mol], 'can')
          val[:mdl] = molecule_output(val[:mol], 'mdl')
        end
      end

      def refine_reaction
        # Check if there are any "unused" object
        # Detect and add it to correspond reaction group
        refine_unused

        @reactionmap.each_value do |value|
          react = map_reaction_by_id(value)
          @reaction.push(react)
        end

        # Link text to molecule of each group
        refine_reaction_group
      end

      def refine_unused
        # Arrange molecule to reaction if current ChemDraw version
        # fits with IGNORE_VERSION
        assemble_to_reaction if @is_ignore

        loop do
          unused = all_unused
          ral = reaction_arrow_list

          unused.each do |k, v|
            arrow_id = detect_reaction_arrow_id(v, ral)
            rid = reaction_id_from_arrow(arrow_id)
            next if rid.nil?
            add_to_reaction_by_id(k, v, rid)
          end

          # Remove invalid reaction before so that "unused" object can be linked
          # to the valid reaction
          remove_invalid_reaction

          invalid_count = @reactionmap.select { |_, v|
            invalid_reaction?(v)
          }.count

          break if invalid_count.zero? || @arrowmap.count.zero?
        end
      end

      def remove_invalid_reaction
        @reactionmap.delete_if do |_, val| invalid_reaction?(val) end
        used_mols = @reactionmap.values.uniq
        @molmap.each do |k, v|
          v.delete(:added) unless used_mols.include?(k)
        end
      end

      def add_to_reaction_by_id(key, obj, reaction_id)
        reaction = @reactionmap[reaction_id]
        arrow = @arrowmap[reaction[:arrow]]
        group = detect_position(obj, arrow)

        return if group.nil?

        sgroup = group.to_sym
        reaction[sgroup] = [] if reaction[group.to_sym].nil?
        reaction[sgroup] << key unless reaction[sgroup].include?(key)
      end

      def refine_arrow
        return if @ext_arrowmap.size.zero?

        @ext_arrowmap.each do |key, ext|
          remove_from_reactionmap(key)
          box = ext[:box]
          extend_arrow(box.righttop, box.leftbottom)
          @ext_arrowmap[key].merge!(extended: true)
        end
      end

      def refine_eln_reaction
        arrow = @arrowmap.values.first
        reaction = { reactants: [], reagents: [], products: [] }
        @molmap.each_value do |mol|
          add_mol_to_react(reaction, mol, arrow)
        end

        @reaction[0] = reaction
      end

      def clean_molmap
        @molmap.delete_if do |_, val| val.nil? end

        # Remove atom which have no bond
        # in case of nested fragment has only 1 atom
        @molmap.each_value do |m|
          mol = m[:mol]
          atom_ids = []
          (1..mol.num_atoms).each do |i|
            atom = mol.get_atom(i)
            # check if atom has any bond, ignore if it has charge (ion)
            atom_ids << i if atom_no_bond?(atom)
          end

          atom_ids.each_with_index do |val, idx|
            atom = mol.get_atom(val - idx)
            mol.delete_atom(atom)
          end
        end
      end

      def atom_no_bond?(atom)
        (atom.get_atomic_num != 1 &&
         atom.get_formal_charge.zero? && # we will not remove ion
         !atom.has_single_bond &&
         !atom.has_non_single_bond)
      end

      def assemble_to_reaction
        @reactionmap.each do |k, r|
          reaction = { reactants: [], reagents: [], products: [] }
          arrow = @arrowmap[r[:arrow]]
          aline = line_from_arrow(arrow)

          @molmap.each do |kmol, mol|
            group = detect_position(mol, arrow)
            intersects = polygon_intersects_with_line?(mol[:polygon], aline)
            belong_to_reaction = (group == 'reagents') ||
                                 (group != 'reagents' && intersects)
            next unless belong_to_reaction

            mol[:added] = true
            reaction[group.to_sym] << kmol
          end

          chain_reaction(k, reaction)
          @reactionmap[k].merge!(reaction)
        end

        refine_seperate_mol
      end

      # Remove molecule(s) which is/are seperated with other
      # Check A -> B -> C case
      def chain_reaction(key, reaction)
        @reactionmap.each do |k, r|
          next if k == key || r[:reactants].nil? || r[:products].nil?

          check = (reaction[:reactants] & r[:reactants]).count.positive? &&
                  (r[:products] & reaction[:products]).count.positive?
          next unless check

          if (reaction[:reactants] & r[:reagents]).count.positive?
            reaction[:reactants] -= r[:reagents]
          end

          reaction[:reactants] -= r[:reactants]
          r[:products] -= reaction[:products]
        end
      end

      def refine_seperate_mol
        @reactionmap.each_value do |r|
          arrow = @arrowmap[r[:arrow]]
          %w[reactants products].each do |group|
            rgroup = r[group.to_sym]
            next if rgroup.count < 2
            dist_map = {}

            rgroup.each do |id|
              min = 10_000_000
              mol = @molmap[id]
              next if mol.nil?

              da = Geometry.distance(mol[:center], arrow[:center])
              (rgroup - [id]).each do |mid|
                om = @molmap[mid]
                next if om.nil?
                d = Geometry.distance(mol[:center], om[:center])
                min = d < min ? d : min
              end
              dist_map[id] = da < min ? da : min
            end

            min_dist = dist_map.sort_by { |_, value| value }.first.last
            remove_map = dist_map.select { |_, v| v > (1.5 * min_dist) }
            remove_keys = remove_map.keys

            remove_map.each_key do |k|
              mol = @molmap[k]
              (rgroup - [k]).each do |id|
                om = @molmap[id]
                d = Geometry.distance(mol[:center], om[:center])
                remove_keys << id if d < (1.5 * min_dist)
              end
            end

            rgroup.delete_if { |x| remove_keys.include?(x) }
          end
        end
      end

      # def refine_text
      #   @textmap.each_value do |value|
      #     text_arr = value[:text].split(/[\s,; ()]/).uniq
      #     text_arr.each do |text|
      #       next if text.empty?
      #       mol = expand_abb(text)
      #     end
      #   end
      # end
    end
  end
end
