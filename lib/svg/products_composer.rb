require 'nokogiri'
require 'digest'

module SVG
  class ProductsComposer < ReactionComposer
    def initialize(materials_svg_paths, options = {})
      products_only(materials_svg_paths, options)

      init_materials(materials_svg_paths)
      init_parameters(options)
      init_word_size
      init_arrow_width
      init_svg
    end

    def compose_svg
      compose_reaction_svg
    end

    private

    def products_only(materials_svg_paths, options)
      materials_svg_paths[:starting_materials] = []
      materials_svg_paths[:reactants] = []
      options[:solvents] = []
      options[:temperature] = ""
    end

    def section_it
      sections = {}
      y_center = (global_view_box_array[3]/2).round
      sections[:starting_materials] = ""
      arrow_x_shift = 0
      arrow_y_shift = 0
      sections[:reactants] = ""
      sections[:arrow] = ""
      global_view_box_array[2] += 0
      @max_height_for_products = find_material_max_height(products)
      sections[:products] = compose_material_group products, { start_at: global_view_box_array[2], y_center: y_center }
      @sections=sections
    end
  end
end
