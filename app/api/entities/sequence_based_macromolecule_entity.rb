# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeEntity < ApplicationEntity
    expose! :name
    expose! :uniprot_ids
  end
end
