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
        optional :products_only, type: Boolean, default: false
        optional :show_yield, type: Boolean, default: true
        optional :steps, type: Array, desc: 'per-step materials and conditions for multi-step schemes'
      end
      post do
        paths = params[:materials_svg_paths]
        composer_class = params[:products_only] ? SVG::ProductsComposer : SVG::ReactionComposer
        composer_options = {
          temperature: params[:temperature],
          solvents: params[:solvents],
          duration: params[:duration],
          conditions: params[:conditions],
          show_yield: params[:show_yield],
          steps: Array(params[:steps]).map { |step| step.to_h.symbolize_keys },
        }

        composer = composer_class.new(paths, composer_options)
        { reaction_svg: composer.compose_svg }
      end
    end
  end
end
