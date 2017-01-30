module Reporter
  module Docx
    class DiagramSample < Diagram

      private

      def set_svg(_)
        @svg_data = SVG::SampleComposer.new(sample_svg_paths)
                                       .compose_reaction_svg
      end

      def sample_svg_paths
        paths = {}
        paths[:starting_materials] = []
        paths[:reactants] = []
        paths[:products] = [obj.get_svg_path]
        return paths
      end
    end
  end
end
