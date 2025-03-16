# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeSearchResultEntity < ApplicationEntity
    expose :identifier
    expose :full_name
    expose :short_name
    expose :primary_accession
    expose :ec_numbers
    expose :organism
    expose :taxon_id
    expose :available_sources

    def available_sources
      if object.respond_to?(:available_sources)
        object.available_sources
      elsif object.is_a?(SequenceBasedMacromolecule)
        ['eln']
      else
        ['unknown']
      end
    end
  end
end
