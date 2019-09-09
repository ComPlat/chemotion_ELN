module Reporter
  module Docx
    class DetailSample < Detail
      def initialize(args)
        super
        @obj = args[:sample]
      end

      def content
        {
          title: title,
          iupac_name: iupac_name,
          sum_formular: sum_formular,
          collections: collection_label,
          structure: structure,
          analyses: analyses,
          not_last: id != last_id,
          is_sample: true,
        }
      end

      private

      def title
        "#{obj.molecule_iupac_name} (#{obj.name.presence || obj.external_label.presence || obj.short_label.presence})"
      end

      def iupac_name
        "#{obj.molecule_iupac_name}"
      end

      def sum_formular
        "#{obj.molecule[:sum_formular]}"
      end

      def structure
        DiagramSample.new(obj: obj, format: @img_format).generate
      end

      def analyses
        paragraphs = merge_items(init_item, obj.analyses)
        paragraph = remove_redundant_space_break(paragraphs)
        Sablon.content(:html, Delta.new({"ops" => paragraph}).getHTML())
      end

      def init_item
        item = []
        need_rxn_desc = @spl_settings[:reaction_description]
        has_description = obj.reactions.first&.description
        if need_rxn_desc && has_description
          item += obj.reactions.first.description["ops"].map(&:to_h)
        end
        item
      end
    end
  end
end
