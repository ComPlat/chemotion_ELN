module Reporter
  module Docx
    class Detail
      attr_reader :obj, :digit, :last_id
      def initialize(args)
        @spl_settings = args[:spl_settings]
        @rxn_settings = args[:rxn_settings]
        @configs = args[:configs] || { whole_diagram: true }
        @last_id = args[:last_id]
        @digit = args.fetch(:digit, 3)
        @img_format = args[:img_format]
      end

      private

      def id
        obj.id
      end

      def collection_label
        obj.collections.map { |c| c[:label] if c[:label] != "All" }.compact.join(", ")
      end

      def merge_items(init, items)
        items.reduce(init) do |sum, i|
          ops =
            if i["extended_metadata"] && i["extended_metadata"]["content"]
              JSON.parse(i["extended_metadata"]["content"])["ops"]
            elsif i[:extended_metadata] && i[:extended_metadata][:content]
              JSON.parse(i[:extended_metadata][:content])["ops"]
            else
              []
            end

          sum + ops
        end
      end

      def remove_redundant_space_break(ops)
        ops.map.with_index do |op, i|
          op["insert"] = op["insert"].gsub(/\s\s+/, " ")
          op["insert"] = op["insert"].lstrip if i == 0
          op["insert"] = op["insert"].gsub(/\n/, " ")
          op
        end
      end
    end
  end
end
