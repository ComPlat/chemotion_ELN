module Reporter
  module Docx
    class DiagramReaction < Diagram

      private

      def set_svg(products_only)
        if products_only
          @svg_data = SVG::ProductsComposer.new(materials_svg_paths,
                                                is_report: true).compose_svg
        else
          @svg_data = SVG::ReactionComposer.new(materials_svg_paths,
                                                solvents: solvents,
                                                temperature: temperature_svg_paths,
                                                is_report: true).compose_reaction_svg
        end
      end

      def materials_svg_paths
        paths = {}
        paths[:starting_materials] = obj.starting_materials.map(&:get_svg_path)
        paths[:reactants] = obj.reactants.map(&:get_svg_path)
        paths[:products] = obj.products.map do |p|
          yield_amount = ReactionsProductSample.find_by(reaction_id: obj.id, sample_id: p.id).equivalent
          [p.get_svg_path, yield_amount]
        end
        return paths
      end

      def solvents
        obj.solvents.present? ? obj.solvents.map{ |s| s.preferred_tag } : [obj.solvent]
      end

      def temperature_svg_paths
        [obj.temperature_display_with_unit].reject{|c| c.blank?}.join(", ")
      end
    end
  end
end
