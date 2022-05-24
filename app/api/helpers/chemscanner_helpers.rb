# frozen_string_literal: true

# ChemScanner gem helper
module ChemscannerHelpers
  require 'base64'
  require 'open3'

  extend Grape::API::Helpers

  def build_reaction_svg(reaction)
    reaction_mdl_info = {
      starting_materials: reaction.reactants.map(&:mdl),
      reactants: reaction.reagents.map(&:mdl),
      solvents: reaction.solvents.map(&:mdl),
      products: reaction.products.map(&:mdl)
    }

    SVG::ChemscannerComposer.reaction_svg_from_mdl(reaction_mdl_info) do |mdl|
      Chemotion::RdkitService.svg_from_molfile(mdl)
    end
  end

  def serialize_outputs(files, schemes, reactions, molecules, get_mol)
    display = get_mol ? 'molecules' : 'reactions'

    serialized_files = files.map { |f|
      Chemscanner::SourceSerializer.new(f).serializable_hash
    }

    serialized_schemes = schemes.map { |s|
      ss = Chemscanner::SchemeSerializer.new(s).serializable_hash
      ss.merge(display: display)
    }

    serialized_reactions = reactions.map { |r|
      sr = Chemscanner::ReactionSerializer.new(r).serializable_hash
      next sr if get_mol

      sr.merge(svg: build_reaction_svg(r))
    }

    serialized_molecules = molecules.map { |m|
      sm = Chemscanner::MoleculeSerializer.new(m).serializable_hash
      next sm unless get_mol

      sm.merge(svg: Chemotion::RdkitService.svg_from_molfile(m.mdl))
    }

    {
      files: serialized_files,
      schemes: serialized_schemes,
      reactions: serialized_reactions,
      molecules: serialized_molecules
    }
  end

  def serialize_storage_outputs(files, schemes, reactions, molecules)
    serialized_files = files.order(:id).map { |f|
      Chemscanner::SourceSerializer.new(f).serializable_hash
    }

    serialized_schemes = schemes.sort_by(&:id).map { |s|
      Chemscanner::StorageSchemeSerializer.new(s).serializable_hash
    }

    serialize_items = lambda do |items|
      items.map { |item|
        {
          id: item.id,
          extended_metadata: item.extended_metadata,
          imported_id: item.imported_id,
          is_approved: item.is_approved,
          scheme_id: item.scheme.id
        }
      }
    end

    {
      files: serialized_files,
      schemes: serialized_schemes,
      reactions: serialize_items.call(reactions.sort_by(&:id)),
      molecules: serialize_items.call(molecules.sort_by(&:id))
    }
  end
end
