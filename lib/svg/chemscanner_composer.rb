# frozen_string_literal: true

require 'nokogiri'
require 'digest'

module SVG
  # SVG Composer for ChemScanner
  class ChemscannerComposer
    REACTANT_SCALE = 0.75

    WORD_SIZE_BASE_SVG = 14
    WORD_SIZE_SVG_SCALE = 1.7

    ARROW_LENGTH_BASE = 120
    ARROW_LENGTH_SCALE = 50

    def initialize(materials_svg_paths)
      init_materials(materials_svg_paths)

      num_elements = @num_reactants + @num_starting_materials + @num_products
      svg_ws = WORD_SIZE_BASE_SVG + num_elements * WORD_SIZE_SVG_SCALE

      @word_size = svg_ws
      @arrow_length = @num_reactants * ARROW_LENGTH_SCALE + ARROW_LENGTH_BASE

      @viewbox_x = 0
      @viewbox_y = 0
      @viewbox_width = 50
      @viewbox_height = 50

      @y_arrow = 25
    end

    def self.reaction_svg_from_mdl(mdl_info, &svg_engine)
      files = {
        starting_materials: [],
        reactants: [],
        solvents: [],
        products: []
      }

      %w[starting_materials reactants solvents products].each do |g|
        svg_arr = mdl_info[g.to_sym].map do |m, _|
          svg_engine.call(m)
        end

        files[g.to_sym].concat(svg_arr)
      end

      new(files).compose_reaction_svg
    end

    def compose_reaction_svg
      set_group_max_height
      set_global_view_box_height
      set_arrow_position

      starting_material_svg, starting_material_width = compose_material_group(
        @starting_materials,
        y_arrow: @y_arrow
      )
      @viewbox_width += starting_material_width + 50

      reactant_svg, reactant_width = compose_material_group(
        @reactants,
        start_at: @viewbox_width,
        scale: REACTANT_SCALE,
        y_arrow: @y_arrow - (@reactants_max_height * REACTANT_SCALE / 2) - 5,
        is_reactants: true
      )

      solvent_svg, solvent_width = compose_material_group(
        @solvents,
        start_at: @viewbox_width,
        scale: REACTANT_SCALE,
        y_arrow: @y_arrow + (@solvents_max_height * REACTANT_SCALE / 2) + 10,
        is_reactants: true,
        is_solvents: true
      )

      @arrow_length = [reactant_width, solvent_width, 50].max + 80

      arrow_svg = [
        "<g transform='translate(#{@viewbox_width}, #{@y_arrow})'>",
        arrow_it,
        '</g>'
      ].join

      @viewbox_width += @arrow_length + 40 # adjust to products

      product_svg, product_width = compose_material_group(
        @products,
        start_at: @viewbox_width,
        y_arrow: @y_arrow
      )
      @viewbox_width += product_width

      sections = [
        starting_material_svg, reactant_svg, solvent_svg, arrow_svg, product_svg
      ].flatten.map(&:strip).join

      template_it.strip + sections + '</svg>'
    end

    private

    def init_materials(materials_svg_arr)
      %w[starting_materials reactants solvents products].each do |g|
        gvalue = materials_svg_arr[g.to_sym]

        instance_variable_set("@#{g}".to_sym, gvalue)
        instance_variable_set("@num_#{g}".to_sym, gvalue.size)
      end

      @num_reactants = 1 if @reactants.empty? && !@num_starting_materials.zero?
    end

    def template_it
      viewbox = [@viewbox_x, @viewbox_y, @viewbox_width, @viewbox_height]
      attributes = [
        'version="1.1"',
        'xmlns="http://www.w3.org/2000/svg"',
        'xmlns:xlink="http://www.w3.org/1999/xlink"',
        'xmlns:cml="http://www.xml-cml.org/schema"',
        'width="100%"',
        'height="100%"'
      ]

      <<-SVG
        <svg #{attributes.join(' ')} viewBox="#{viewbox.join(' ')}" >
      SVG
    end

    def temperature_it
      <<-SVG
        <svg font-family="sans-serif">
          <text text-anchor="middle" x="#{@arrow_length / 2}" y="30" font-size="#{@word_size + 2}">#{@temperature}</text>
        </svg>
      SVG
    end

    def arrow_it
      <<-SVG
        <svg stroke="black" stroke-width="1">
          <line x1="0" y1="4" x2="#{@arrow_length}" y2="4" stroke="black"/>
          <polygon points="#{@arrow_length - 8},4 #{@arrow_length - 10},7 #{@arrow_length},4 #{@arrow_length - 10},1"/>
        </svg>
      SVG
    end

    def divide_it(x_coord = 0, y_coord = 0)
      <<-SVG
      <svg font-family="sans-serif" font-size="28">
          <text x="#{x_coord}" y="#{y_coord}">+</text>
      </svg>
      SVG
    end

    def find_material_max_height(materials = [])
      max = 0

      materials.each do |material|
        svg = inner_sample_svg(material)
        vb = if svg['viewBox']
               svg['viewBox'].split(/\s+/).map(&:to_i)
             else
               [0, 0, 0, 0]
             end

        max < vb[3] && (max = vb[3])
      end

      max
    end

    def set_group_max_height
      @starting_materials_max_height = find_material_max_height(@starting_materials)
      @reactants_max_height = find_material_max_height(@reactants)
      @solvents_max_height = find_material_max_height(@solvents)
      @products_max_height = find_material_max_height(@products)
    end

    def set_arrow_position
      middle_height = @viewbox_height / 2
      check_middle = (
        (@reactants_max_height * REACTANT_SCALE) + 5 < middle_height &&
        (@solvents_max_height * REACTANT_SCALE) + 5 < middle_height
      )

      if check_middle
        @y_arrow = middle_height
      else
        @y_arrow = @reactants_max_height * REACTANT_SCALE
        @viewbox_height = @y_arrow * 2
      end
    end

    def set_global_view_box_height
      @viewbox_height = [
        (@reactants_max_height + @solvents_max_height) * REACTANT_SCALE,
        @starting_materials_max_height,
        @products_max_height,
        @viewbox_height
      ].max + 50
    end

    def inner_sample_svg(svg)
      doc = Nokogiri::XML(svg)
      doc.at_css('svg')
    end

    def compose_material_group(materials, options = {})
      x_shift = options[:start_at] || 0
      y_arrow = options[:y_arrow] || 0
      scale = options[:scale] || 1
      group_width = 0

      group_svg = ''
      materials.each_with_index do |material, idx|
        if idx.positive?
          group_width += 10
          group_svg += divide_it(group_width, y_arrow)
          group_width += 50
        end

        svg = inner_sample_svg(material)
        next unless svg['viewBox']

        viewbox = svg['viewBox'].split(/\s+/).map(&:to_i)
        x_shift = group_width + 10 - viewbox[0]
        y_shift = (y_arrow - viewbox[3] * scale / 2).round

        group_width += viewbox[2] + 10
        svg['width'] = "#{viewbox[2]}px"
        svg['height'] = "#{viewbox[3]}px"

        group_svg += [
          "<g transform='translate(#{x_shift}, #{y_shift}) scale(#{scale})'>",
          svg.parent.inner_html,
          '</g>'
        ].join
      end

      reactant_shift = options[:is_reactants] ? 30 : 0
      output_svg = [
        "<g transform='translate(#{@viewbox_width + reactant_shift}, 0)'>",
        group_svg,
        '</g>'
      ].join('')
      output_width = (group_width * scale).round

      [output_svg, output_width]
    end

    def compose_arrow_and_reaction_labels(options = {})
      x_shift = options[:start_at]
      y_shift = options[:arrow_y_shift]

      [
        "<g transform='translate(#{x_shift}, #{y_shift})'>",
        arrow_it,
        '</g>',
        "<g transform='translate(#{x_shift}, #{y_shift})'>",
        temperature_it,
        '</g>'
      ].join('')
    end
  end
end
