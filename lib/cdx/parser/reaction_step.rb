# frozen_string_literal: true

module Cdx
  module Parser
    # CDX Reaction parser
    module ReactionStep
      include Base

      def do_reaction(cdxr, cid)
        return if @is_ignore

        react = {}
        @reactionmap[cid] = react

        while (tag = cdxr.read_next).positive?
          data = cdxr.data
          case tag
          when CDX_PROP_REACTIONSTEP_ARROWS
            add_arrow(react, read_int32(data))
          when CDX_PROP_REACTIONSTEP_REACTANTS
            add_to_react(cdxr, data, react, 'reactants')
          when CDX_PROP_REACTIONSTEP_PRODUCTS
            add_to_react(cdxr, data, react, 'products')
          when CDX_PROP_REACTIONSTEP_OBJECTSABOVEARROW,
               CDX_PROP_REACTIONSTEP_OBJECTSBELOWARROW
            add_to_react(cdxr, data, react, 'reagents')
          end
        end
      end

      def do_xml_reaction(nodes)
        return if @is_ignore

        nodes.each do |node|
          next unless node.name == 'step'
          nid = (node.attr('id') || 0).to_i
          react = {}

          @reactionmap[nid] = react

          node.attributes.each do |key, value|
            case key
            when 'ReactionStepArrows'
              add_arrow(react, value.text.to_i)
            when 'ReactionStepReactants'
              xml_add_to_react(value, react, 'reactants')
            when 'ReactionStepProducts'
              xml_add_to_react(value, react, 'products')
            when 'ReactionStepObjectsAboveArrow',
                 'ReactionStepObjectsBelowArrow'
              xml_add_to_react(value, react, 'reagents')
            end
          end
        end
      end

      def xml_add_to_react(value, react, type)
        value.text.split(' ').each do |val|
          id = val.to_i
          react[type.to_sym] = [] if react[type.to_sym].nil?
          react[type.to_sym].push(id)
          map_set_added(id)
        end
      end

      def add_to_react(cdxr, data, react, type)
        (cdxr.len / 4).times do
          id = read_int32(data)

          react[type.to_sym] = [] if react[type.to_sym].nil?
          react[type.to_sym].push(id)
          map_set_added(id)
        end
      end

      def map_set_added(id)
        # return @toplvmap unless @toplvmap[id].nil?
        @molmap[id]&.merge!(added: true)
        @textmap[id]&.merge!(added: true)
        @groupmap[id]&.each { |m| m[:added] = true }
      end

      def add_arrow(react, arrow_id)
        react[:arrow] = @graphicmap[arrow_id] || arrow_id
      end
    end
  end
end
