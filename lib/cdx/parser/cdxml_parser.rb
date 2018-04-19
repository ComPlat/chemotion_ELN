# frozen_string_literal: true

module Cdx
  # Main CDX Parser module
  module Parser
    # EQUIL_ARROW = 1

    # Read and Parse CDXML
    class CdxmlParser
      include Fragment
      include ReactionStep
      include Text
      include Arrow
      include Graphic
      include Refine

      CDXML_DOCTYPE = 'http://www.cambridgesoft.com/xml/cdxml.dtd'

      attr_reader :arrowmap, :reaction, :textmap, :molmap, :groupmap,
                  :reactionmap, :toplvmap, :graphicmap

      def read(file, is_path = true)
        initialize

        fs = is_path ? File.open(file) : file
        cdxml = Nokogiri::XML(fs)
        return false if cdxml.internal_subset.system_id != CDXML_DOCTYPE

        read_header(cdxml)

        cdxml.xpath('//page').each do |page|
          top_level_parse(page, 0)

          refine_data
        end
      end

      private

      def read_header(cdxml)
        version = cdxml.xpath('//CDXML/@CreationProgram').text.split(' ').last
        @is_ignore = Gem::Version.new(version) < Gem::Version.new(IGNORE_VERSION)
      end

      def top_level_parse(nodes, cgroup)
        nodes.element_children.each do |node|
          nid = (node.attr('id') || 0).to_i
          nodes = node.element_children

          case node.name
          when 'group' then do_xml_group(node, nid, cgroup)
          when 'fragment' then do_xml_fragment(nodes, nid, cgroup)
          when 'scheme' then do_xml_reaction(nodes)
          when 't' then do_xml_text(node, nid)
          when 'graphic' then do_xml_graphic(node, nid)
          when 'geometry', 'arrow' then do_xml_geometry(node, nid)
          end
        end
      end

      def do_xml_group(node, nid, cgroup)
        @groupmap[cgroup].push(id: nid) if cgroup.positive?
        @groupmap[nid] = []
        top_level_parse(node, nid)
      end
    end
  end
end
