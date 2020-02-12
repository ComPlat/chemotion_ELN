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
        filename = composer.compose_reaction_svg_and_save temp: true
        { reaction_svg: filename }
      end
    end
  end
end
