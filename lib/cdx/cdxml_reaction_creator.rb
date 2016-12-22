module Cdx
  class CdxmlReactionCreator
    X_SHIFT = 60
    Y_SHIFT = 600
    X_SPACE = 30
    ARW_X_SPACE = 60
    PLUS_SHIFT = 60
    YIELD_SPACE = 60
    SOLVENT_Y_SPACE = 30
    SOLVENT_Y_SHIFT = 60
    TEMPERATURE_Y_SHIFT = 30

    attr_accessor :reaction
    attr_reader :arw_l, :arw_r
    def initialize(args)
      @reaction = args[:reaction]
      @plus_arr = []
      @yield_arr = []
    end

    def convert
      reaction_to_cdxml
    end

    private
    def reaction_to_cdxml
      sm, @arw_l = samples_cdxml(reaction.starting_materials, X_SHIFT, Y_SHIFT, "starting")
      re, @arw_r = samples_cdxml(reaction.reactants, arw_l + ARW_X_SPACE, Y_SHIFT, "reactant")
      pr, _      = samples_cdxml(reaction.products, arw_r + ARW_X_SPACE, Y_SHIFT, "product")
      merge(sm + re + pr, arrow_cdxml, plus_cdxml, yield_cdxml, temperature_cdxml, solvents_cdxml)
    end

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

    def arrow_cdxml
      arw_tail = arw_l
      arw_head = arw_r
      y = Y_SHIFT

      "\n <arrow id=\"9999\" Z=\"1\" FillType=\"None\" ArrowheadHead=\"Full\" ArrowheadType=\"Solid\" HeadSize=\"1000\" ArrowheadCenterSize=\"875\" ArrowheadWidth=\"250\" Head3D=\"" +
      "#{arw_head} #{y}" + " 0\" Tail3D=\"" + "#{arw_tail} #{y}" + " 0\" />"
    end

    def yield_cdxml
      @yield_arr.map { |pl| text_template(pl) }.join(" ")
    end

    def add_yield_icon(sample, x_shift, y_shift, geometry)
      product_sample = sample.reactions_product_samples[0]
      @yield_arr << {
        value: product_sample.try(:formatted_yield),
        x: x_shift + geometry[:x_len] / 2,
        y: y_shift + geometry[:y_len] / 2 + YIELD_SPACE
      }
    end

    def temperature_cdxml
      el = {
        value: reaction.temperature_display_with_unit,
        x: (arw_l + arw_r) / 2,
        y: Y_SHIFT + TEMPERATURE_Y_SHIFT,
      }
      text_template(el)
    end

    def solvents_cdxml
      x = (arw_l + arw_r) / 2
      y = Y_SHIFT + SOLVENT_Y_SHIFT
      cdxml = ""
      reaction.solvents.each do |s|
        el = { x: x, y: y, value: s.external_label }
        cdxml += text_template(el)
        y += SOLVENT_Y_SPACE
      end
      return cdxml
    end

    def text_template(el)
      text = el[:value]
      x = el[:x]
      y = el[:y]
      "\n <t p=\"#{x} #{y}\"><s font=\"20\" size=\"12\" color=\"0\">#{text}</s></t>"
    end
  end
end
