module Report
  module Docx
    class Document
      attr_reader :objs, :contents
      def initialize(args)
        @objs = args[:reactions]
        @contents = Array.new
      end

      def reactions
        objs.each do |reaction|
          contents.push(reaction_content(reaction))
        end
        contents
      end

      private
      def reaction_content(reaction)
        ReactionDetail.new(reaction: reaction, last_id: last_id).content
      end

      def last_id
        id ||= objs.last.id
      end
    end
  end
end
