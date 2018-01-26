module Reporter
  module Spectrum
    class Document
      attr_reader :objs, :contents
      def initialize(args)
        @objs = args[:objs]
        @mol_serials = args[:mol_serials]
        @font_family = args[:font_family]
        @contents = Array.new
        @index = 0
      end

      def convert
        objs.each do |obj|
          obj_os = OpenStruct.new(obj)
          content, @index = to_content(obj_os)
          contents.push(content)
        end
        contents
      end

      private

      def to_content(obj)
        Reporter::Spectrum::Detail.new(
          index: @index,
          obj: obj,
          mol_serials: @mol_serials,
          font_family: @font_family,
        ).content
      end
    end
  end
end
