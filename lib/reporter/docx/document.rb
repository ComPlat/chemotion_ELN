module Reporter
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
        @font_family = args[:font_family]
        @template = args[:template]
        @mol_serials = args[:mol_serials]
      end

      def convert
        objs.each_with_index do |obj, i|
          obj_os = OpenStruct.new(obj)
          contents.push(to_content(obj_os, i))
        end
        contents
      end

      private
      def to_content(obj, index)
        type_name = obj.type.capitalize
        "Reporter::Docx::Detail#{type_name}".constantize.new(
          "#{type_name.downcase}": obj,
          index: index,
          spl_settings: @spl_settings,
          rxn_settings: @rxn_settings,
          configs: @configs,
          last_id: last_id,
          img_format: @img_format,
          font_family: @font_family,
          template: @template,
          mol_serials: @mol_serials,
        ).content
      end

      def last_id
        id ||= objs.last[:id]
      end
    end
  end
end
