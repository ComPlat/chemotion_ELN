# frozen_string_literal: true

module Chemscanner
  # Chemscanner::ReactionStep serializer
  class ReactionStepSerializer < ActiveModel::Serializer
    attributes :time, :temperature, :description, :reaction_external_id,
               :step_number, :reagent_smiles, :reagent_ids
  end
end
