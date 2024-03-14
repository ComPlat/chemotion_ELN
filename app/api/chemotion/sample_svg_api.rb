# frozen_string_literal: true

module Chemotion
  # API to handle multi component sample SVGs
  class SampleSvgAPI < Grape::API
    resource :sample_svg do
      desc 'Combine sample svgs'
      params do
        requires :materials_svg_paths, type: Hash, desc: 'Starting-, Reactants, Product-Materials'
      end
      post do
        paths = params[:materials_svg_paths]
        composer = SVG::ProductsComposer.new(paths)
        { sample_svg: composer.compose_svg }
      end
    end
  end
end
