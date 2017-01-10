module Cdxml
  class Creator
    X_SHIFT = 60
    Y_SHIFT = 600
    X_SPACE = 30
    ARW_X_SPACE = 60
    PLUS_SHIFT = 60
    YIELD_SPACE = 60
    SOLVENT_Y_SPACE = 30
    SOLVENT_Y_SHIFT = 60
    TEMPERATURE_Y_SHIFT = 30

    attr_reader :arw_l, :arw_r
    def initialize(args)
      @plus_arr = []
      @yield_arr = []
    end

    private

    def samples_cdxml(samples, x_shift, y_shift, sample_type)
      is_reactant = sample_type == "reactant"
      is_product = sample_type == "product"
      cdxmls = []
      plus_y_shift = is_reactant ? y_shift - PLUS_SHIFT : y_shift
      samples.each do |s|
        shifter = { x: x_shift, y: y_shift, is_reactant: is_reactant }
        cdxml = Chemotion::OpenBabelService.get_cdxml_from_molfile(s.molfile, shifter)
        add_yield_icon(s, x_shift, y_shift, cdxml[:geometry]) if is_product
        x_shift += cdxml[:geometry][:x_len] + X_SPACE # space between material-to-plus
        add_plus_icon(x_shift, plus_y_shift)
        x_shift += X_SPACE # space between plus-to-material
        cdxmls << cdxml[:content]
      end
      remove_ending_plus
      return cdxmls, x_shift
    end

    def merge(cdxmls, *args)
      content = cdxmls.map do |r|
        r.split("\n")[4..-3]
      end.join("\n")

      "<?xml version=\"1.0\"?>\n<!DOCTYPE CDXML\nSYSTEM \"http://www.camsoft.com/xml/cdxml.dtd\">\n<CDXML BondLength=\"30\">\n <page>\n" +
      content + args.join("") +
      "\n </page>\n</CDXML>\n"
    end

    def plus_cdxml
      @plus_arr.map { |pl| text_template(pl) }.join(" ")
    end

    def add_plus_icon(x, y)
      @plus_arr << { value: "+", x: x, y: y }
    end

    def remove_ending_plus
      @plus_arr.pop
    end
  end
end
