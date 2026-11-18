# frozen_string_literal: true

module Entities
  # wraps a ReactionsReactantSbmmSample object
  class ReactionSbmmMaterialEntity < ApplicationEntity
    # Merge SBMM sample fields into the top level, similar to ReactionMaterialEntity
    expose! :sequence_based_macromolecule_sample, using: 'Entities::SequenceBasedMacromoleculeSampleEntity', merge: true

    expose! :position
    expose! :reference
    expose! :show_label
    expose! :equivalent
    expose! :weight_percentage
    # the stock sample this reaction material was split from: a reaction copy splits the same stock
    expose! :parent_id

    def parent_id
      object.sequence_based_macromolecule_sample&.parent_id
    end
  end
end
