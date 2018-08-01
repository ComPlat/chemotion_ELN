require 'csv'

module Reporter
  module Csv
    class ReactionList
      IMG_HEIGHT = 51
      IMG_WIDTH = 180
      TEXT_SIZE = 14
      ROW_PRD_BEGIN = 3
      C_W = 25
      IMG_BEGIN_X = 1
      IMG_BEGIN_Y = 3
      ROW_HEIGHT = 40

      def initialize(args)
        @objs = args[:objs]
        @mol_serials = args[:mol_serials] || []
      end

      def create(file_name)
        CSV.open(file_name, 'wb') do |csv|
          row_main_title(csv)
          row_info(csv)
          row_sub_title(csv)
          row_content(csv)
        end
      end

      private

      def row_main_title(csv)
        csv << ['Article Reference', '', '', '', '', 'Article DOI', '', '']
      end

      def row_info(csv)
        csv << ['reference', '', '', '', '', 'doi:', '', '']
      end

      def row_sub_title(csv)
        csv << ['Label', 'Image', 'Name', 'InChI', 'InChIKey',
                'Long-RInChIKey', 'Web-RInChIKey', 'Short-RInChIKey']
      end

      def row_content(csv)
        @objs.each do |obj|
          long_key, web_key, short_key = Reporter::Helper.get_rinchi_keys(obj)

          obj[:products].each do |p|
            serial = Reporter::Helper.mol_serial(p[:molecule][:id], @mol_serials)
            csv << [serial, '', p[:showed_name], p[:molecule][:inchistring],
                    p[:molecule][:inchikey], long_key, web_key, short_key, '']
          end
        end
      end
    end
  end
end
