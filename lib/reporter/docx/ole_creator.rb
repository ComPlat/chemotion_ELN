require 'ole/storage'

module Reporter
  module Docx
    class OleCreator
      attr_accessor :obj, :ole_instance
      def initialize(args)
        @obj = args[:obj]
      end

      def template_path
        @ole_instance = Tempfile.new(["ole_object", ".bin"])
        copy_from_bin_template
        ole_instance.path
      end

      def path
        cdx = obj_to_cdx
        generate_ole_path(cdx)
      end

      private

      def obj_to_cdx
        klass = obj.type.capitalize
        cdxml = "Cdxml::Create#{klass}".constantize
                  .new({ klass.downcase.to_sym => obj }).to_cdxml
        Cdx::Creator.new({cdxml: cdxml}).to_cdx
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
