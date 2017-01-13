module Report
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
        obj.analyses.map do |a|
          { content: Sablon.content(:html, Delta.new(a["content"]).getHTML()),
            description: a["description"] }
        end
      end
    end
  end
end
