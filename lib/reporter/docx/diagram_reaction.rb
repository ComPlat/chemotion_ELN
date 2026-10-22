module Reporter
  module Docx
    class DiagramReaction < Diagram

      private

      def set_svg(products_only)
        si = @template == 'supporting_information'
        show_yield = !si
        if products_only
          @svg_data = SVG::ProductsComposer
                      .new(materials_svg_paths,
                           is_report: true,
                           show_yield: show_yield,
                           supporting_information: si)
                      .compose_svg
        else
          @svg_data = SVG::ReactionComposer
                      .new(materials_svg_paths,
                           solvents: solvents,
                           temperature: temperature_svg_paths,
                           duration: obj.duration,
                           conditions: obj.conditions,
                           is_report: true,
                           show_yield: show_yield,
                           supporting_information: si,
                           steps: steps_svg_paths)
                      .compose_reaction_svg
        end
      end

      def load_svg_paths
        paths = {}
        svg_text_path = Proc.new do |s|
          text = (s[:name].presence || s[:sum_formula].presence || s[:molecule][:iupac_name]) || ''
          "svg_text/#{text}"
        end

        paths[:starting_materials] = obj.starting_materials.map { |m| m[:show_label] == true ? svg_text_path.call(m) : m[:get_svg_path] }.compact
        paths[:reactants] = obj.reactants.map { |m| m[:show_label] == true ? svg_text_path.call(m) : m[:get_svg_path] }.compact
        paths[:reactants] += Array(obj.reactant_sbmm_samples).map do |sbmm|
          label = sbmm[:name].presence || sbmm[:short_label].presence || sbmm[:external_label].presence
          "svg_text/#{label}" if label.present?
        end.compact
        paths[:products] = obj.products.map do |p|
          svg = p[:show_label] == true ? svg_text_path.call(p) : p[:get_svg_path]
          [svg, p[:equivalent]] if svg.present?
        end.compact
        @materials_svg_paths = paths
      end

      def solvents
        obj.solvents.present? ? obj.solvents.map{ |s| s[:preferred_tag] } : [obj.solvent]
      end

      def steps_svg_paths
        return [] unless obj.reaction_type == 'multi_step'

        Array(obj.reaction_steps).sort_by { |step| step[:position] }
                                 .each_with_index.map { |step, index| step_svg_paths(step, index) }
      end

      def step_svg_paths(step, index)
        carried, products = in_step(obj.products, step).partition { |p| p[:carry_on] }
        {
          starting_materials: in_step(obj.starting_materials, step).filter_map { |m| material_svg(m) },
          reactants: step_reactants_svg(step, index),
          carried: products_svg(carried),
          products: products_svg(products),
          temperature: Reaction.step_temperature_text(step[:temperature]),
          duration: step[:duration],
          conditions: step[:conditions],
          solvents: step_solvents(step, index),
        }
      end

      def step_reactants_svg(step, index)
        reactants = in_step(obj.reactants, step).filter_map { |m| material_svg(m) }
        index.zero? ? reactants + sbmm_svg_paths : reactants
      end

      def products_svg(products)
        products.filter_map { |product| (svg = material_svg(product)).present? && [svg, product[:equivalent]] }
      end

      def sbmm_svg_paths
        Array(obj.reactant_sbmm_samples).filter_map do |sbmm|
          label = sbmm[:name].presence || sbmm[:short_label].presence || sbmm[:external_label].presence
          "svg_text/#{label}" if label.present?
        end
      end

      def in_step(materials, step)
        Array(materials).select { |material| material[:reaction_step_id] == step[:id] }
      end

      def step_solvents(step, index)
        names = in_step(obj.solvents, step).pluck(:preferred_tag)
        names.presence || (index.zero? && obj.solvents.blank? ? [obj.solvent].compact_blank : [])
      end

      def material_svg(material)
        return material[:get_svg_path] unless material[:show_label] == true

        label = material[:name].presence || material[:sum_formula].presence || material.dig(:molecule, :iupac_name)
        "svg_text/#{label}"
      end

      def temperature_svg_paths
        [obj.temperature_display_with_unit].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
