# frozen_string_literal: true

# == Schema Information
#
# Table name: chemscanner_reaction_steps
#
#  id                   :bigint           not null, primary key
#  reaction_id          :integer          not null
#  reaction_external_id :integer          not null
#  reagent_ids          :integer          default([]), is an Array
#  reagent_smiles       :string           default([]), is an Array
#  step_number          :integer          not null
#  description          :string
#  temperature          :string
#  time                 :string
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  deleted_at           :datetime
#


# ChemScanner scanned reaction(s)
module Chemscanner
  # ChemScanner reaction steps
  class ReactionStep < ActiveRecord::Base
    acts_as_paranoid

    belongs_to :reaction, class_name: 'Reaction',
                foreign_key: :output_id, optional: true

    def assign_from_chemscanner(step)
      assign_attributes(
        description: step.description,
        temperature: step.temperature,
        time: step.time
      )
    end
  end
end
