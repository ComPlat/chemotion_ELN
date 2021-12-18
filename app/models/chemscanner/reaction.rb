# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_reactions
#
#  id                :bigint           not null, primary key
#  scheme_id         :integer          not null
#  external_id       :integer          not null
#  clone_from        :integer
#  description       :string
#  temperature       :string
#  time              :string
#  status            :string
#  yield             :float
#  details           :jsonb
#  extended_metadata :jsonb
#  is_approved       :boolean          default(FALSE)
#  imported_id       :integer
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  deleted_at        :datetime
#


module Chemscanner
  # ChemScanner scanned reaction(s)
  class Reaction < ActiveRecord::Base
    acts_as_paranoid

    belongs_to :scheme, class_name: 'Scheme', foreign_key: :scheme_id

    has_many :steps, class_name: 'ReactionStep', foreign_key: :reaction_id

    has_many :reactions_molecules, dependent: :destroy
    has_many :molecules, through: :reactions_molecules, source: :molecule

    has_many :reactions_reactant_molecules,
             class_name: 'ReactionsReactantMolecule',
             dependent: :destroy
    has_many :reactants,
             through: :reactions_reactant_molecules, source: :molecule

    has_many :reactions_reagent_molecules,
             class_name: 'ReactionsReagentMolecule',
             dependent: :destroy
    has_many :reagents,
             through: :reactions_reagent_molecules, source: :molecule

    has_many :reactions_solvent_molecules,
             class_name: 'ReactionsSolventMolecule',
             dependent: :destroy
    has_many :solvents,
             through: :reactions_solvent_molecules, source: :molecule

    has_many :reactions_product_molecules,
             class_name: 'ReactionsProductMolecule',
             dependent: :destroy
    has_many :products,
             through: :reactions_product_molecules,
             source: :molecule

    def assign_from_chemscanner(reaction)
      assign_attributes(
        external_id: reaction.arrow_id,
        clone_from: reaction.clone_from,
        description: reaction.description,
        temperature: reaction.temperature,
        time: reaction.time,
        status: reaction.status,
        yield: reaction.yield,
        details: reaction.details.to_h || {}
      )
    end

    def remove_reagent_smiles(smiles)
      to_remove = reagents.select { |m| smiles.include?(m.cano_smiles) }
      ids = to_remove.map(&:id)
      to_remove.each(&:destroy)

      save!
      ids
    end

    def add_reagent_smiles(smiles)
      max_id = (reactants + reagents + products).map(&:external_id).max

      added = []
      smiles.each do |s|
        rw_mol = RDKitChem::RWMol.mol_from_smiles(s)

        m = Molecule.create(
          cano_smiles: s,
          scheme_id: scheme_id,
          mdl: rw_mol.mol_to_mol_block(true, -1, false),
          external_id: max_id += 1
        )

        rm = ReactionsMolecule.create(
          type: 'Chemscanner::ReactionsReagentMolecule',
          reaction_id: id,
          molecule_id: m.id
        )
        reactions_reagent_molecules << rm
        added.push(m)
      end

      save!

      added
    end
  end
end
