require 'erb'

module Reporter
  module Html
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
        @template_path = args[:template_path]
        @file_name = nil
        @tmp_img_paths = []
        @tmp_html = Tempfile.new
      end

      def create(f_name)
        @file_name = f_name

        generate_html
        zip_files
      end

      private

      def zip_files
        Zip::File.open(@file_name, Zip::File::CREATE) do |zipfile|
          zipfile.add(@file_name.sub_ext('.html').basename, @tmp_html.path)
          zipfile.mkdir('images')

          @tmp_img_paths.each do |p|
            zipfile.add(get_zip_img_path(p), p)
          end
        end
      end

      def generate_html
        erb_str = File.read(@template_path)

        result = render_erb(erb_str, wrap_data)

        @tmp_html.write(result)
        @tmp_html.close
      end

      def render_erb(template, data = {})
        render_binding = binding
        data.each do |k, v| render_binding.local_variable_set(k.to_sym, v) end
        ERB.new(template, nil, '%<>').result(render_binding)
      end

      def wrap_data
        { rows: rows_content }
      end

      def rows_content
        data = []
        @objs.each do |obj|
          long_key, web_key, short_key = Reporter::Helper.get_rinchi_keys(obj)

          obj[:products].each do |p|
            data << row_content(p, long_key, web_key, short_key)
          end
        end
        data
      end

      def row_content(p, long_key, web_key, short_key)
        tmp_img_path = Reporter::Helper.mol_img_path(p)
        @tmp_img_paths << tmp_img_path
        serial = Reporter::Helper.mol_serial(p[:molecule][:id], @mol_serials)
        {
          label: serial,
          image: get_zip_img_path(tmp_img_path),
          showed_name: p[:showed_name],
          inchi: p[:molecule][:inchistring],
          inchikey: p[:molecule][:inchikey],
          long_key: long_key,
          web_key: web_key,
          short_key: short_key
        }
      end

      def get_zip_img_path(path)
        pn = Pathname.new(path)
        "./images/#{pn.basename}"
      end
    end
  end
end
