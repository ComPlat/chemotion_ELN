# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_reactions_molecules
#
#  id          :integer          not null, primary key
#  reaction_id :integer          not null
#  molecule_id :integer          not null
#  type        :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  deleted_at  :datetime
#


module Chemscanner
  class ReactionsReagentMolecule < ReactionsMolecule
    # STI: this file is only here because of rails model autoloading.
    # place all code in app/models/chemscanner/reactions_molecule.rb.
  end
end
