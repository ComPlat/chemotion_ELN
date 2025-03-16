# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeSampleEntity < ApplicationEntity
    expose! :id
    expose! :name
    expose! :external_label
    expose! :short_label
    expose! :function_or_application
    expose! :concentration
    expose! :molarity
    expose! :volume_as_used
    expose! :sequence_based_macromolecule, using: "Entities::SequenceBasedMacromoleculeEntity"

    expose_timestamps
  end
end
