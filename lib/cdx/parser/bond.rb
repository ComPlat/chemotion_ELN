# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Bond parser
    module Bond
      include Base
      @needs_kekulization = false

      BOND_ORDER = {
        '0xFFFF': nil,
        '0x0001': 1,
        '0x0002': 2,
        '0x0004': 3,
        '0x0008': 4,
        '0x0010': 5,
        '0x0020': 6,
        '0x0040': 0.5,
        '0x0080': 1.5,
        '0x0100': 2.5,
        '0x0200': 3.5,
        '0x0400': 4.5,
        '0x0800': 5.5
      }.freeze

      def reset_bond_params
        @bgn_id = nil
        @end_id = nil
        @stereo = 1
        @order = 1
      end

      def do_bond(cdxr, mol, atmap, almap)
        reset_bond_params
        read_bond(cdxr)
        @bgn_id, @end_id = @end_id, @bgn_id if [4, 7, 10, 12].include?(@stereo)
        add_bond(mol, atmap, almap)
        bond = mol.get_bond(mol.num_bonds - 1)
        do_bond_stereo(bond) unless bond.nil?
      end

      def do_xml_bond(node, mol, atmap, almap)
        reset_bond_params

        node.attributes.each do |key, value|
          case key
          when 'B' then @bgn_id = value.text.to_i
          when 'E' then @end_id = value.text.to_i
          when 'Order' then @order = value.text.to_i
          when 'Display' then @stereo = do_xml_bond_display(value.text)
          end
        end

        @bgn_id, @end_id = @end_id, @bgn_id if [4, 7, 10, 12].include?(@stereo)
        add_bond(mol, atmap, almap)
        bond = mol.get_bond(mol.num_bonds - 1)
        do_bond_stereo(bond) unless bond.nil?
      end

      def do_xml_bond_display(val)
        case val
        when 'Solid' then 0
        when 'Dash' then 1
        when 'Hash' then 2
        when 'WedgedHashBegin' then 3
        when 'WedgedHashEnd' then 4
        when 'Bold' then 5
        when 'WedgeBegin' then 6
        when 'WedgeEnd' then 7
        when 'Wavy' then 8
        when 'HollowWedgeBegin' then 9
        when 'HollowWedgeEnd' then 10
        when 'WavyWedgeBegin' then 11
        when 'WavyWedgeEnd' then 12
        when 'Dot' then 13
        when 'DashDot' then 14
        end
      end

      def read_bond(cdxr)
        while (tag = cdxr.read_next).positive?
          data = cdxr.data
          case tag
          when CDX_PROP_BOND_BEGIN then @bgn_id = read_int32(data)
          when CDX_PROP_BOND_END then @end_id = read_int32(data)
          when CDX_PROP_BOND_ORDER then @order = do_bond_order(data)
          when CDX_PROP_BOND_DISPLAY then @stereo = read_int16(data)
          end
        end
      end

      def do_bond_order(data)
        # cdx_order = format('0x%04x', read_int16(data).to_s)
        # BOND_ORDER[cdx_order.to_sym].floor || 1

        cdx_order = read_int16(data)

        case cdx_order
        when 0x0001 then 1
        when 0x0002 then 2
        when 0x0004 then 3
        when 0x0008 then 4
        when 0x0080 then 5
        else 1
        end
      end

      def do_bond_stereo(bond)
        return if @stereo.nil?
        bond.set_hash if [3, 4].include?(@stereo)
        bond.set_wedge if [6, 7].include?(@stereo)
      end

      def add_bond(mol, atmap, almap)
        bid = ->(x) { atmap[x] || 1 }

        # We will connect bond whose endpoint are either
        # ExternalConnectionPoint or Nickname (Fragment)
        if almap.key?(@bgn_id) && almap[@bgn_id][:type] == 12
          almap[@bgn_id][:to_atom] = bid.call(@end_id)
        elsif almap.key?(@end_id) && almap[@end_id][:type] == 12
          almap[@end_id][:to_atom] = bid.call(@bgn_id)
        elsif almap.key?(@end_id) && [4, 5].include?(almap[@end_id][:type])
          nid = almap.keys[almap.keys.find_index(@end_id) - 1]
          ninfo = almap.delete(nid)
          mol_add_bond(mol, bid.call(@bgn_id), ninfo[:to_atom], @order)
          almap[:deleted] += [ninfo[:node], almap.delete(@end_id)[:node]]
        elsif almap.key?(@bgn_id) && [4, 5].include?(almap[@bgn_id][:type])
          nid = almap.keys[almap.keys.find_index(@bgn_id) - 1]
          ninfo = almap.delete(nid)
          mol_add_bond(mol, ninfo[:to_atom], bid.call(@end_id), @order)
          almap[:deleted] += [ninfo[:node], almap.delete(@bgn_id)[:node]]
        else
          # Else add bond normally
          mol_add_bond(mol, bid.call(@bgn_id), bid.call(@end_id), @order)
        end
      end

      def mol_add_bond(mol, bidx, eidx, order)
        flags = 0
        if order == 5
          @needs_kekulization = true
          flags = OpenBabel::OB_AROMATIC_BOND
          order = 1
        end

        mol.add_bond(bidx, eidx, order, flags)

        # return unless flags == OpenBabel::OB_AROMATIC_BOND
        # bond = mol.get_bond(bidx, eidx)
        # bond.get_begin_atom.set_aromatic
        # bond.get_end_atom.set_aromatic
        # bond.set_aromatic
        # puts "check aromatic: #{bond.is_aromatic}"
      end
    end
  end
end
