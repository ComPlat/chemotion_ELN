require 'ole/storage'

module Report
  module Docx
    class OleCreator
      attr_accessor :obj, :ole_instance
      def initialize(args)
        @obj = args[:obj]
      end

      def path
        cdx = reaction_to_cdx
        generate_ole_path(cdx)
      end

      private
      def reaction_to_cdx
        cdxml = Cdx::CdxmlReactionCreator.new({reaction: obj}).convert
        Cdx::CdxmlToCdx.new({cdxml: cdxml}).convert
      end

      def generate_ole_path(cdx)
        @ole_instance = Tempfile.new(["ole_object", ".bin"])
        copy_from_bin_template
        insert_cdx_to_bin_content(cdx)

        ole_instance.path
      end

      def copy_from_bin_template
        template_path = Rails.root.join("lib", "template", "template.bin")
        FileUtils.cp(template_path, ole_instance.path)
      end

      def insert_cdx_to_bin_content(cdx)
        ole_editor = Ole::Storage.open(ole_instance.path, "rb+")
        ole_editor.file.open("CONTENTS", "w").write(cdx)
        ole_editor.close
      end
    end
  end
end
