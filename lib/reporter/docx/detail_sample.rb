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
          collections: collection_label,
          structure: structure,
          analyses: analyses,
          not_last: id != last_id,
          is_sample: true,
        }
      end

      private

      def title
        "#{obj.molecule_iupac_name} (#{obj.short_label})"
      end

      def structure
        DiagramSample.new(obj: obj, format: @img_format).generate
      end

      def analyses
        paragraphs = merge_items(init_item, obj.analyses)
        paragraph = remove_line_break(paragraphs)
        Sablon.content(:html, Delta.new({"ops" => paragraph}).getHTML())
      end

      def init_item
        item = []
        need_rxn_desc = @spl_settings[:reaction_description]
        has_description = obj.reactions.first.try(:description)
        if need_rxn_desc && has_description
          item += obj.reactions.first.description["ops"].map(&:to_h)
        end
        item
      end

      def merge_items(init, items)
        items.reduce(init) do |sum, i|
          sum + i["content"]["ops"]
        end
      end

      def remove_line_break(paragraphs)
        paragraphs.map do |p|
          p["insert"] = p["insert"].tr("\n", " ")
          p
        end
      end
    end
  end
end
