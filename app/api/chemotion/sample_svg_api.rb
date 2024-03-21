# frozen_string_literal: true

module Chemotion
  # API to handle multi component sample SVGs
  class SampleSvgAPI < Grape::API
    resource :sample_svg do
      desc 'Combine sample svgs'
      params do
        requires :materials_svg_paths, type: Hash, desc: 'Starting-, Reactants, Product-Materials'
        requires :molfiles, type: Array, desc: 'molfile for each component'
      end
      post do
        reaction = RDKitChem::ChemicalReaction.new
        params[:molfiles].each do |molfile|
            mol = RDKitChem::mol_block_to_mol(molfile)
            reaction.add_reactant_template(mol)
        end
        rxn_block = RDKitChem::chemical_reaction_to_rxn_block(reaction)

        paths = params[:materials_svg_paths]
        composer = SVG::ProductsComposer.new(paths)
        { sample_svg: composer.compose_svg, molfile: rxn_block }
      end
    end
  end
end
