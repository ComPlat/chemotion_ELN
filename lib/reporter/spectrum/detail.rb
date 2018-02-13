module Reporter
  module Spectrum
    class Detail
      MAX_WIDTH = 2000
      MAX_HEIGHT = 1100

      def initialize(args)
        @prd = args[:obj]
        @mol_serials = args[:mol_serials]
        @font_family = args[:font_family]
        @index = args[:index] || 0
      end

      def content
        return {
          prd_info: prd_info_html,
          atts: atts_content,
        }, @index
      end

      private

      def prd_info_html
        Sablon.content(
          :html,
          Delta.new({'ops' => prd_info_delta}, @font_family).getHTML()
        )
      end

      def prd_info_delta
        font_size = 14
        mol_serial_delta(@prd, font_size) +
          space_delta +
          iupac_name_delta(@prd, font_size)
      end

      # - - - - - - - - - -
      def atts_content
        @prd['atts'].map do |att|
          att_content(att)
        end.compact
      end

      def att_content(att)
        return nil unless att
        img = image(att[:obj])
        return nil unless img
        @index += 1
        {
          img: img,
          kind: kind_html(att[:kind]),
          page_break: page_break_when_even_index
        }
      end

      def page_break_when_even_index
        @index.to_i.even? ? true : false
      end

      def kind_html(kind)
        Sablon.content(
          :html,
          Delta.new({'ops' => kind_delta(kind)}, @font_family).getHTML()
        )
      end

      def kind_delta(kind)
        font_size = 12
        [{ 'attributes' => { 'font-size' => font_size },
           'insert' => kind }]
      end

      def image(target)
        begin
          img = scale_img(target)
          Sablon::Image::Definition.new(
            target.filename, img.to_blob, img.columns, img.rows
          )
        rescue
          nil
        end
      end

      def scale_img(target)
        img = Magick::Image.read(target.abs_path).first
        img = img.resize_to_fit(MAX_WIDTH, MAX_HEIGHT)
      end

      # - - - - - - - - - -
      def space_delta()
        [{ 'insert' => ' ' }]
      end

      def iupac_name_delta(prd, font_size = 12)
        [{ 'attributes' => { 'font-size' => font_size },
           'insert' => prd['iupac_name'] }]
      end

      def mol_serial(mol_id)
        s = @mol_serials.select { |x| x['mol'] && x['mol']['id'] == mol_id }[0]
        s.present? && s['value'].present? && s['value'] || 'xx'
      end

      def mol_serial_delta(prd, font_size = 12)
        serial = mol_serial(prd['molId'])
        [{ 'attributes' => { 'font-size' => font_size }, 'insert' => '[' }] +
        [{ 'attributes' => { 'bold' => 'true', 'font-size' => font_size },
           'insert' => serial }] +
        [{ 'attributes' => { 'font-size' => font_size }, 'insert' => ']' }]
      end
    end
  end
end
