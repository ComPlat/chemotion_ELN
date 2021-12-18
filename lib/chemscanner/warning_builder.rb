# coding: utf-8
# frozen_string_literal: true

# ChemScanner wrapper lib
module Chemscanner
  # Process scheme and return list of warnings
  class WarningBuilder
    def initialize(scheme, cs_object, cs_molecules, cs_reactions)
      @scheme = scheme
      @cs_object = cs_object
      @molecules = @cs_object.molecules
      @reactions = @cs_object.reactions

      @cs_molecules = cs_molecules
      @cs_reactions = cs_reactions
    end

    def build
      build_molecule_warnings
      build_reaction_warnings
      build_scheme_warnings
    end

    private

    # - Molecules containing alias(es) with two attachment points
    # - Molecules that have warning(s) from ChemDraw
    def build_molecule_warnings
      n_atoms = @cs_object.n_atoms
      bracket_warning = 'Molecule contains bracket(s)'

      @molecules.each do |molecule|
        mid = molecule.id
        cs_molecule = @cs_molecules.detect { |cs| cs.external_id == mid }
        next if cs_molecule.nil?

        warning_atoms = molecule.atom_map.values.select(&:warning)
        alias_atoms = molecule.atom_map.values.select(&:is_alias)

        warnings = warning_atoms.map { |atom|
          "Atom #{atom.get_idx}: #{atom.warning_data}".gsub(/\u0000/, '')
        }

        alias_atoms.each do |atom|
          num_bonds = atom.get_rd_atom.get_bonds.size
          next if num_bonds <= 1

          warnings.push("Alias atom #{atom.get_idx} have #{num_bonds} bonds")
        end

        warnings.push(bracket_warning) if n_atoms.key?(mid)

        next if warnings.empty?

        current_warnings = cs_molecule.extended_metadata[:warnings] || []
        cs_molecule.extended_metadata[:warnings] = current_warnings.concat(warnings)
      end
    end

    # - Reactions containing 2 alias Rx
    # - Reactions containing alias and no definition for Alias
    # - Reactions missing temperature
    # - Reactions missing time
    # - Molecules including [Atom or letters in general]
    # - Multistep reactions
    def build_reaction_warnings
      @reactions.each do |reaction|
        cs_reaction = @cs_reactions.detect { |cs| cs.external_id == reaction.arrow_id }
        next if cs_reaction.nil?

        warnings = []
        warnings.push('Reaction missing temperature') if reaction.temperature.empty?
        warnings.push('Reaction missing time') if reaction.time.empty?
        warnings.push('Reaction has multisteps') unless reaction.steps.empty?

        num_aliases = 0
        %w[reactants reagents products].each do |group|
          groups = reaction.send(group)

          groups.each do |m|
            next if m.atom_map.nil?

            aliases = m.atom_map.values.select(&:is_alias)
            num_aliases += aliases.count
          end
        end

        if num_aliases.positive? && reaction.clone_from.nil?
          warnings.push("Reaction has #{num_aliases} aliases")

          derived = @reactions.detect { |r| r.clone_from == reaction.arrow_id }
          warnings.push('Reaction containing aliases with no definitions') if derived.nil?
        end
        next if warnings.empty?

        current_warnings = cs_reaction.extended_metadata[:warnings] || []
        cs_reaction.extended_metadata[:warnings] = current_warnings.concat(warnings)
      end
    end

    # - Scheme contains line-molecule (which already excluded by ChemScanner)
    def build_scheme_warnings
      return if @cs_object.fragment_as_line.zero?

      current_warnings = @scheme.extended_metadata[:warnings] || []
      line_warning = 'Scheme contains molecule(s) as a straight line'
      @scheme.extended_metadata[:warnings] = current_warnings.push(line_warning)
    end
  end
end
