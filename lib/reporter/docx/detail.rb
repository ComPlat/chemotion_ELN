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
        obj.collections.map { |c| c.label if c.label != "All" }.compact.join(", ")
      end
    end
  end
end
