# frozen_string_literal: true

# ChemScanner wrapper lib
module Chemscanner
  # Build ChemscannerScheme from Chemscanner's scanned molecules and reactions
  class SchemeBuilder
    def initialize(source, cs_object)
      @source = source
      @cs_object = cs_object
      @molecules = @cs_object.molecules
      @reactions = @cs_object.reactions

      @max_id = @molecules.map(&:id).max

      @scheme = @source.schemes.build(
        created_by: @source.created_by,
        version: Process::CHEMSCANNER_VERSION
      )
      @scheme.source = @source
    end

    def build
      build_chemscanner_molecules

      sort_reactions_by_coordinates

      build_chemscanner_reactions

      warning_builder = WarningBuilder.new(@scheme, @cs_object, @cs_molecules, @cs_reactions)
      warning_builder.build

      @scheme
    end

    private

    def build_chemscanner_molecules
      @cs_molecules = @molecules.reduce([]) { |arr, molecule|
        cs_molecule = @scheme.molecules.build
        cs_molecule.scheme = @scheme
        cs_molecule.assign_from_chemscanner(molecule)

        arr.push(cs_molecule)
      }
    end

    def build_chemscanner_reactions
      @cs_reactions = @reactions.reduce([]) { |arr, reaction|
        next arr if reaction.reactants.empty? || reaction.products.empty?

        cs_reaction = @scheme.reactions.build
        cs_reaction.scheme = @scheme
        cs_reaction.assign_from_chemscanner(reaction)

        build_chemscanner_reaction(cs_reaction, reaction)

        arr.push(cs_reaction)
      }
    end

    def build_chemscanner_reaction(cs_reaction, reaction)
      reagent_molecules = build_molecules_from_reagent_smiles(reaction)

      build_reaction_steps(cs_reaction, reaction, reagent_molecules)

      reactants = get_molecules_by_ids(reaction.reactant_ids)
      products = get_molecules_by_ids(reaction.product_ids)

      all_reagents = get_molecules_by_ids(reaction.reagent_ids) + reagent_molecules
      solvents_smis = ChemScanner.solvents.values
      solvents, reagents = all_reagents.partition { |m|
        solvents_smis.include?(m.cano_smiles) || m.details&.dig('Solvent')
      }

      assign_molecules_to_reaction(cs_reaction, reactants, 'Reactant')
      assign_molecules_to_reaction(cs_reaction, reagents, 'Reagent')
      assign_molecules_to_reaction(cs_reaction, solvents, 'Solvent')
      assign_molecules_to_reaction(cs_reaction, products, 'Product')
    end

    def build_molecules_from_reagent_smiles(reaction)
      reagent_molecules = []

      reaction.reagent_smiles.each_with_index do |smi, idx|
        molecule = @scheme.molecules.build
        molecule.scheme = @scheme
        molecule.cano_smiles = smi
        molecule.external_id = @max_id += 1
        molecule.abbreviation = reaction.reagent_abbs[idx]
        molecule.mdl = Chemotion::OpenBabelService.molfile_from_cano_smiles(smi)
        molecule.details = {}

        @cs_molecules.push(molecule)
        reagent_molecules.push(molecule)
      end

      reagent_molecules
    end

    def build_reaction_steps(cs_reaction, reaction, smiles_molecules)
      reaction.steps.each_with_index do |s, idx|
        step = cs_reaction.steps.build

        step.assign_from_chemscanner(s)
        step.reaction_external_id = reaction.arrow_id
        step.step_number = idx + 1

        sreagents = smiles_molecules.select { |m|
          s.reagents.include?(m.cano_smiles)
        }

        step.reagent_ids = sreagents.map(&:id).compact
        step.reagent_smiles = sreagents.map(&:cano_smiles)
      end
    end

    def get_molecules_by_ids(ids)
      @cs_molecules.select { |m| ids.include?(m.external_id) }
    end

    def assign_molecules_to_reaction(reaction, group_molecules, group_class)
      class_string = "Chemscanner::Reactions#{group_class}Molecule"
      group_string = "#{group_class.downcase}s"

      group_molecules.each do |molecule|
        rm = ReactionsMolecule.new(type: class_string)
        rm.reaction = reaction
        rm.molecule = molecule

        group_value = reaction.send(group_string)
        reaction.send("#{group_string}=", group_value.push(molecule))
      end
    end

    # rubocop:disable Metrics/AbcSize
    def sort_reactions_by_coordinates
      @reactions.sort! { |r1, r2| r1.arrow.head.x <=> r2.arrow.head.x }
                .sort! { |r1, r2| r2.arrow.head.y <=> r1.arrow.head.y + 1 }
    end
    # rubocop:enable Metrics/AbcSize
  end
end
