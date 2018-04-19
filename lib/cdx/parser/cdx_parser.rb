# frozen_string_literal: true

module Cdx
  # Main CDX Parser module
  module Parser
    # EQUIL_ARROW = 1

    # Class which traverse the tree in CDX binary files
    class CDXParser
      include Fragment
      include ReactionStep
      include Text
      include Arrow
      include Graphic
      include Refine

      attr_reader :arrowmap, :reaction, :textmap, :molmap, :groupmap,
                  :reactionmap, :toplvmap, :graphicmap

      def read(file, is_path = true)
        initialize

        @cdxr = Reader.new(file, is_path)
        return false unless @cdxr.valid

        read_header(@cdxr)

        until @cdxr.end?
          p = top_level_parse(@cdxr, 0)
          return false unless p
        end

        refine_data
      end

      private

      def read_header(cdxr)
        tag = cdxr.read_next until tag == CDX_PROP_CREATIONPROGRAM
        version = cdxr.data.split(' ').last
        @is_ignore = Gem::Version.new(version) < Gem::Version.new(IGNORE_VERSION)
      end

      # rubocop:disable Metrics/CyclomaticComplexity
      def top_level_parse(cdxr, cgroup)
        while (tag = cdxr.read_next(true)).positive?
          cid = cdxr.current_id

          case tag
          when CDX_OBJ_GROUP then do_group(cdxr, cid, cgroup)
          when CDX_OBJ_FRAGMENT then do_fragment(cdxr, cid, cgroup)
          when CDX_OBJ_REACTIONSTEP then do_reaction(cdxr, cid)
          when CDX_OBJ_TEXT then do_text(cdxr, cid)
          when CDX_OBJ_GEOMETRY then do_geometry(cdxr, cid)
          when CDX_OBJ_GRAPHIC then do_graphic(cdxr, cid)
          end

        end
        true
      end
      # rubocop:enable Metrics/CyclomaticComplexity

      def do_group(cdxr, cid, cgroup)
        @groupmap[cgroup].push(id: cid) if cgroup.positive?
        @groupmap[cid] = []
        top_level_parse(cdxr, cid)
      end
    end
  end
end
