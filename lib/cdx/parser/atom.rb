# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Node parser
    module Atom
      include Base

      WARNING = 'Chemical Interpretation is not possible for this label'

      def reset_node_params
        {
          num_hydrogens: -1,
          atnum: -1,
          spin: 0,
          charge: 0,
          iso: 0,
          type: -1,
          alias_text: '',
          warning: false,
          warning_data: '',
          is_alias: false
        }
      end

      def do_node(cdxr, mol, atom, atmap, almap)
        props = reset_node_params
        # Read all node properties
        while (tag = cdxr.read_next).positive?
          data = cdxr.data
          case tag
          # when CDX_PROP_CHEMICALWARNING then is_mol = false
          when CDX_PROP_NODE_ELEMENT then props[:atnum] = read_int16(data)
          when CDX_PROP_ATOM_RADICAL then props[:spin] = read_int16(data)
          when CDX_PROP_ATOM_ISOTOPE then props[:iso] = read_int16(data)
          when CDX_OBJ_FRAGMENT
            do_fragment_impl(cdxr, mol, atmap, almap) if props[:is_alias]
          when CDX_PROP_NODE_TYPE
            props[:type] = read_int16(data)
            props[:is_alias] = true if [4, 5, 12].include?(props[:type])
          when CDX_PROP_2DPOSITION
            props[:y] = read_int32(data) * 1.0e-6
            props[:x] = read_int32(data) * 1.0e-6
          when CDX_PROP_ATOM_CHARGE
            props[:charge] = cdxr.len == 1 ? data.unpack('c*')[0] : read_int32(data)
          # when CDX_PROP_ATOM_NUMHYDROGENS then next
          # when CDX_PROP_ATOM_CIPSTEREOCHEMISTRY then next
          when CDX_OBJ_TEXT
            text_props = do_text(cdxr)
            props[:warning] = text_props[:warning] unless props[:warning]
            if props[:warning_data].nil? || props[:warning_data].empty?
              props[:warning_data] = text_props[:warning_data]
            end
            props[:alias_text] = text_props[:text]
            props[:polygon] = text_props[:polygon]
          when CDX_PROP_CHEMICALWARNING
            props[:warning] = true
            props[:warning_data] = data
          when CDX_PROP_ATOM_NUMHYDROGENS then props[:num_hydrogens] = read_int16(data)
          else do_unhandled(cdxr, tag)
          end
        end

        do_atom(atom, atmap, almap, props)
      end

      def do_xml_node(node, mol, atom, atmap, almap)
        props = reset_node_params
        # Read all node properties

        node.attributes.each do |key, value|
          case key
          # when CDX_PROP_CHEMICALWARNING then is_mol = false
          when 'Element' then props[:atnum] = value.text.to_i
          when 'Radical' then props[:spin] = value.text.to_i
          when 'Isotope' then props[:iso] = value.text.to_i
          when 'NodeType'
            props[:type] = do_xml_node_type(value.text)
            props[:is_alias] = true if [4, 5, 12].include?(props[:type])
          when 'p'
            value_arr = value.text.split(' ')
            props[:x] = value_arr[0].to_f
            props[:y] = value_arr[1].to_f
          when 'Charge' then props[:charge] = value.text.to_i
          when 'Warning'
            props[:warning] = true
            props[:warning_data] = value.text
          when 'NumHydrogens' then props[:num_hydrogens] = value.text.to_i
          end
        end

        node.xpath('t').each do |t|
          text_props = do_xml_text(t)
          props[:warning] = text_props[:warning] unless props[:warning]
          is_warning = props[:warning_data].nil? || props[:warning_data].empty?
          props[:warning_data] = text_props[:warning_data] if is_warning
          props[:alias_text] = text_props[:text]
          props[:polygon] = text_props[:polygon]
        end

        if props[:is_alias]
          node.xpath('fragment').each do |fragment|
            do_xml_fragment_impl(fragment.element_children, mol, atmap, almap)
          end
        end

        do_atom(atom, atmap, almap, props)
      end

      def do_xml_node_type(type)
        case type
        # when 'Unspecified' then 4
        when 'Nickname' then 4
        when 'Fragment' then 5
        when 'GenericNickname' then 7
        when 'ExternalConnectionPoint' then 12
        else 0
        end
      end

      def do_atom(atom, atmap, almap, props)
        props[:is_alias] = check_warning(props) unless props[:is_alias]
        attext = props[:alias_text]

        atom.set_vector(props[:x], props[:y], 0) unless props[:x].nil? || props[:y].nil?

        # Check R-group
        # r_group = attext == 'R' || (attext.size == 2 && attext[1].to_i.positive?)
        r_group = !(attext =~ /R\d?/).nil?

        # If R-group
        # return atom_alias(atom, attext, props[:polygon]) if props[:type] == 7 && r_group
        return atom_r_group(atom, attext) if props[:type] == 7 && r_group
        # Treat text as an alias
        return do_alias(atom, atmap, almap, props) if props[:is_alias]

        set_atom_props(atom, props)
      end

      def set_atom_props(atom, props)
        props[:atnum].negative? && props[:atnum] = 6
        if props[:num_hydrogens] >= 0
          atom.set_implicit_hcount(props[:num_hydrogens])
          num_hydrogens(atom)
        end

        atom.set_atomic_num(props[:atnum])
        atom.set_formal_charge(props[:charge])
        atom.set_isotope(props[:iso])

        # New OpenBabel API removed SetSpinMultiplicity
        # atom.set_spin_multiplicity(props[:spin])
      end

      def do_alias(atom, atmap, almap, props)
        atom.set_atomic_num(0)
        atom_alias(atom, props[:alias_text], props[:polygon])

        nid = atmap.key(atom.get_idx)

        # NodeType: ExternalConnectionPoint - Begin of Bond
        # NodeType: Nickname or Fragment - End of Bond
        almap[nid] = { node: atom.get_idx, type: props[:type] }

        # if (!alias_text.empty? && atnum.negative?)
        #   expand_mol(mol, atom, cid, alias_text)
        # end
      end

      def atom_r_group(atom, text)
        ad = OpenBabel::AliasData.new
        ad.set_alias(text)
        ad.set_origin(OpenBabel::FileformatInput)
        atom.set_atomic_num(0)
        atom.clone_data(ad)
      end

      def atom_alias(atom, text, polygon)
        data = OpenBabel::OBPairData.new
        data.set_attribute('Alias')

        unless polygon.nil?
          box = polygon.bounding_box
          text += "$$$$#{box.leftbottom.x}-#{box.leftbottom.y},\
                   #{box.righttop.x}-#{box.righttop.y}"
        end
        data.set_value(text)
        data.set_origin(OpenBabel::UserInput)

        atom.set_atomic_num(0)
        atom.clone_data(data)
      end

      def num_hydrogens(atom)
        label = OpenBabel::OBPairData.new
        label.set_attribute('NumHydrogens')
        label.set_value('true')
        label.set_origin(OpenBabel::UserInput)

        atom.clone_data(label)
      end

      def check_warning(props)
        props[:warning] &&
          props[:warning_data].include?('interpret') &&
          !props[:alias_text].empty?
      end
    end
  end
end
