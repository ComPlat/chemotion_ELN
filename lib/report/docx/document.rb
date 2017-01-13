module Report
  module Docx
    class Document
      attr_reader :objs, :contents
      def initialize(args)
        @objs = args[:objs]
        @spl_settings = args[:spl_settings]
        @rxn_settings = args[:rxn_settings]
        @configs = args[:configs]
        @contents = Array.new
        @img_format = args[:img_format]
      end

      def convert
        objs.each do |obj|
          contents.push(to_content(obj))
        end
        contents
      end

      private
      def to_content(obj)
        type_name = obj.class.to_s
        "Report::Docx::Detail#{type_name}".constantize.new(
          "#{type_name.downcase}": obj,
          spl_settings: @spl_settings,
          rxn_settings: @rxn_settings,
          configs: @configs,
          last_id: last_id,
          img_format: @img_format
        ).content
      end

      def last_id
        id ||= objs.last.id
      end
    end
  end
end
