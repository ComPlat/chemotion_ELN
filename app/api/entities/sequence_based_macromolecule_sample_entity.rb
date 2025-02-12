# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeSampleEntity < ApplicationEntity
    expose! :name
    expose! :external_label
    expose! :short_label
    expose! :macromolecule, using: 'Entities::SequenceBasedMacromoleculeEntity'
  end
end
