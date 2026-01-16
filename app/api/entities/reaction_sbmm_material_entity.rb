# frozen_string_literal: true

module Entities
  # wraps a ReactionsReactantSbmmSample object
  class ReactionSbmmMaterialEntity < ApplicationEntity
    # Merge SBMM sample fields into the top level, similar to ReactionMaterialEntity
    expose! :sequence_based_macromolecule_sample, using: 'Entities::SequenceBasedMacromoleculeSampleEntity', merge: true

    expose! :position
    expose! :show_label
  end
end
