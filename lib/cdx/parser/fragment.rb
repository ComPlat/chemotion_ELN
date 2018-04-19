# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Fragment parser
    module Fragment
      include Atom
      include Bond

      def do_fragment(cdxr, cid, cgroup)
        mol = OpenBabel::OBMol.new
        add_to_molmap(cid, mol)
        add_to_groupmap(cid, cgroup)

        mol.begin_modify
        mol.set_dimension(2)
        # Inner of do_fragment, since Fragment can be nested
        do_fragment_impl(cdxr, mol)

        # use 2D coordinates + hash/wedge to determine stereochemistry
        # updown = create_updown_map(mol)
        # OpenBabel.stereo_from_2d(mol, updown)

        mol.end_modify
        true
      end

      def do_fragment_impl(cdxr, mol, atmap = {}, almap = {})
        @needs_kekulization = false
        almap[:deleted] = [] if almap[:deleted].nil?
        while (tag = cdxr.read_next(true)).positive?
          case tag
          when CDX_OBJ_NODE
            # Read all properties of Node
            atom = mol.new_atom
            atmap[cdxr.current_id] = mol.num_atoms
            do_node(cdxr, mol, atom, atmap, almap)
          when CDX_OBJ_BOND then do_bond(cdxr, mol, atmap, almap)
          end
        end

        kekulize(mol)
        remove_alias_atom(mol, almap)
        calculate_implicit_hydrogen(mol)

        true
      end

      # def create_updown_map(mol)
      #   updown = OpenBabel::BondBondDirectionMap.new
      #   0.upto(mol.num_bonds - 1).each do |i|
      #     bond = mol.get_bond(i)
      #     bd = OpenBabel::OBStereo::NotStereo
      #     flag = bond.get_flags
      #     bd = OpenBabel::OBStereo::UpBond if (flag & OpenBabel::OBBond::Wedge).positive?
      #     bd = OpenBabel::OBStereo::DownBond if (flag & OpenBabel::OBBond::Hash).positive?
      #     check_unknown = (flag & OpenBabel::OBBond::WedgeOrHash).positive? || (
      #       (flag & OpenBabel::OBBond::CisOrTrans).positive? &&
      #       bond.get_order == 2
      #     )
      #     bd = OpenBabel::OBStereo::UnknownDir if check_unknown
      #     updown[bond] = bd if bd != OpenBabel::OBStereo::NotStereo
      #   end
      #   updown
      # end

      def do_xml_fragment(nodes, nid, cgroup)
        mol = OpenBabel::OBMol.new
        add_to_molmap(nid, mol)
        add_to_groupmap(nid, cgroup)

        mol.begin_modify
        mol.set_dimension(2)
        do_xml_fragment_impl(nodes, mol)

        mol.end_modify
        true
      end

      def do_xml_fragment_impl(nodes, mol, atmap = {}, almap = {})
        @needs_kekulization = false
        almap[:deleted] = [] if almap[:deleted].nil?

        nodes.each do |node|
          nid = (node.attr('id') || 0).to_i

          case node.name
          when 'n'
            atom = mol.new_atom
            atmap[nid] = mol.num_atoms
            do_xml_node(node, mol, atom, atmap, almap)
          when 'b' then do_xml_bond(node, mol, atmap, almap)
          end
        end

        kekulize(mol)
        remove_alias_atom(mol, almap)
        calculate_implicit_hydrogen(mol)
        true
      end

      def add_to_groupmap(cid, cgroup)
        return if cgroup.nil? || cgroup.zero?
        @groupmap[cgroup] = [] if @groupmap[cgroup].nil?
        @groupmap[cgroup].push(id: cid)
      end

      def add_to_molmap(cid, mol)
        if @molmap[cid].nil?
          id = cid
        else
          id = @tempid
          @tempid += 1
        end
        @molmap[id] = {} if @molmap[id].nil?
        @molmap[id].merge!(mol: mol)
      end

      def calculate_implicit_hydrogen(mol)
        (1..mol.num_atoms).each do |i|
          atom = mol.get_atom(i)
          next if atom.has_data('NumHydrogens')
          valence = OpenBabel.get_typical_valence(
            atom.get_atomic_num, atom.bosum, atom.get_formal_charge
          )
          atom.set_implicit_hcount(valence - atom.bosum)
        end
      end

      def remove_alias_atom(mol, almap)
        return unless almap.keys.size == 1
        almap[:deleted].sort.each_with_index do |val, idx|
          atom = mol.get_atom(val - idx)
          mol.delete_atom(atom) if atom.get_atomic_num.zero?
        end
      end

      def kekulize(mol)
        return unless @needs_kekulization

        mol.set_aromatic_perceived
        (0..mol.num_bonds - 1).each do |i|
          bond = mol.get_bond(i)
          next unless bond.is_aromatic
          bond.get_begin_atom.set_aromatic
          bond.get_end_atom.set_aromatic
        end

        OpenBabel.obkekulize(mol)
      end
    end
  end
end
