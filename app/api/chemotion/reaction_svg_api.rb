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

        composer = SVG::ReactionComposer.new(inchikeys, labels: {first: "text", second: "text", third: "text"})
        filename = composer.compose_reaction_svg_and_save
        {:reaction_svg => filename}
      end

      # content_type 'image/svg+xml'
      # env['api.format'] = :binary

      desc "Get reaction_svg by materials_inchikeys"
      params do
        requires :materials_inchikeys, type: Hash, desc: "Starting-, Reactants, Product-Materials"
      end
      post do
        composer = SVG::ReactionComposer.new(params[:materials_inchikeys], labels: {first: "text", second: "text", third: "text"})
        filename = composer.compose_reaction_svg_and_save :temp => true
        {:reaction_svg => filename}
      end
    end
  end
end
