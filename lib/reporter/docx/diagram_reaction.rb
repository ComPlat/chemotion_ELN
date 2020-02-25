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
                           supporting_information: si)
                      .compose_reaction_svg
        end
      end

      def load_svg_paths
        paths = {}
        paths[:starting_materials] = obj.starting_materials.map { |m| m[:get_svg_path] }.compact
        paths[:reactants] = obj.reactants.map { |m| m[:get_svg_path] }.compact
        paths[:products] = obj.products.map do |p|
          [p[:get_svg_path], p[:equivalent]] if p[:get_svg_path].present?
        end.compact
        @materials_svg_paths = paths
      end

      def solvents
        obj.solvents.present? ? obj.solvents.map{ |s| s[:preferred_tag] } : [obj.solvent]
      end

      def temperature_svg_paths
        [obj.temperature_display_with_unit].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
