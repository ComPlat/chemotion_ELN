# frozen_string_literal: true

module Chemotion
  # API to compose a reaction schema SVG
  class ReactionSvgAPI < Grape::API
    resource :reaction_svg do
      desc 'Get reaction_svg by materials_inchikeys'
      params do
        requires :materials_svg_paths, type: Hash, desc: 'Starting-, Reactants, Product-Materials'
        requires :temperature, type: String, desc: 'temperature which is placed under the reaction-arrow'
        optional :duration, type: String, desc: 'duration which is placed under the reaction-arrow'
        requires :solvents, type: Array, desc: 'solvents which is placed under the reaction-arrow'
        optional :conditions, type: String, desc: 'conditions which is placed under the reaction-arrow'
      end
      post do
        paths = params[:materials_svg_paths]
        composer = SVG::ReactionComposer.new(paths, temperature: params[:temperature],
                                                    solvents: params[:solvents],
                                                    duration: params[:duration],
                                                    conditions: params[:conditions],
                                                    show_yield: true)
        data = composer.compose_reaction_svg
        puts data
        # logic to scale each g indviually
        # extract each g tag from the data
        # for each g tag content, calculation width/height on the tags inside g
        # as you get the [x, y] starting-end point, sum all the value for x/y separtely to determine complete height/width
        # Assign viewBox="0 0 found.height found.width"
        # as your svg is scalled
        # add svg tag inside each g tag and assign f.height and f.width as height and width of svg
        # to scale down each svg before assigning to height and width multiple the values by reduction scale (h*.50), (w*.50); in this example everything will reduce to 50% based on their content
        { reaction_svg: data }
      end
    end
  end
end
