module Chemotion
  class ReactionSvgAPI < Grape::API
    resource :reaction_svg do
      desc "Get reaction_svg by reaction_id"
      params do
        requires :reaction_id, type: Integer, desc: "Reaction id"
      end
      get do
        inchikeys = {}
        reaction = Reaction.find(params[:reaction_id])
        inchikeys[:starting_materials] = reaction.starting_materials.map do |material|
          material.molecule.inchikey
        end
        inchikeys[:reactants] = reaction.reactants.map do |material|
          material.molecule.inchikey
        end
        inchikeys[:products] = reaction.products.map do |material|
          material.molecule.inchikey
        end
        label = reaction.solvents + ", " + reaction.temperature

        composer = SVG::ReactionComposer.new(inchikeys, label: label)
        filename = composer.compose_reaction_svg_and_save
        {:reaction_svg => filename}
      end

      desc "Get reaction_svg by materials_inchikeys"
      params do
        requires :materials_inchikeys, type: Hash, desc: "Starting-, Reactants, Product-Materials"
        requires :label, type: String, desc: "label which is placed under the reaction-arrow"
      end
      post do
        composer = SVG::ReactionComposer.new(params[:materials_inchikeys], label: params[:label])
        filename = composer.compose_reaction_svg_and_save :temp => true
        {:reaction_svg => filename}
      end
    end
  end
end
