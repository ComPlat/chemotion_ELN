# frozen_string_literal: true

module Entities
  class ProteinSequenceModificationsEntity < ApplicationEntity
    expose! :modification_n_terminal
    expose! :modification_n_terminal_details
    expose! :modification_c_terminal
    expose! :modification_c_terminal_details
    expose! :modification_insertion
    expose! :modification_insertion_details
    expose! :modification_deletion
    expose! :modification_deletion_details
    expose! :modification_mutation
    expose! :modification_mutation_details
    expose! :modification_other
    expose! :modification_other_details
    expose! :deleted_at
    expose_timestamps
  end
end
