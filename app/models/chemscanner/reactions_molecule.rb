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
  # Chemscanner reaction molecule join table
  class ReactionsMolecule < ActiveRecord::Base
    acts_as_paranoid

    belongs_to :reaction
    belongs_to :molecule
  end

  class ReactionsReactantMolecule < ReactionsMolecule
  end

  class ReactionsReagentMolecule < ReactionsMolecule
  end

  class ReactionsSolventMolecule < ReactionsMolecule
  end

  class ReactionsProductMolecule < ReactionsMolecule
  end
end
