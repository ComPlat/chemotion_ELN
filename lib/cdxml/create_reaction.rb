module Cdxml
  class CreateReaction < Creator
    attr_accessor :reaction
    def initialize(args)
      super
      @reaction = args[:reaction]
    end

    def to_cdxml
      sm, @arw_l = samples_cdxml(reaction.starting_materials, X_SHIFT, Y_SHIFT, "starting")
      re, @arw_r = samples_cdxml(reaction.reactants, arw_l + ARW_X_SPACE, Y_SHIFT, "reactant")
      pr, _      = samples_cdxml(reaction.products, arw_r + ARW_X_SPACE, Y_SHIFT, "product")
      merge(sm + re + pr, arrow_cdxml, plus_cdxml, yield_cdxml, temperature_cdxml, solvents_cdxml)
    end

    private

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
      eq = sample[:equivalent]
      formatted_yield = eq && !eq.nan? ? "#{(eq * 100).round.to_s} %" : "0 %"
      @yield_arr << {
        value: formatted_yield,
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
        el = { x: x, y: y, value: s[:external_label] }
        cdxml += text_template(el)
        y += SOLVENT_Y_SPACE
      end
      return cdxml
    end

    def text_template(el)
      text = " #{el[:value]} "
      x = el[:x]
      y = el[:y]
      "\n <t p=\"#{x} #{y}\"><s font=\"20\" size=\"12\" color=\"0\">#{text}</s></t>"
    end
  end
end
