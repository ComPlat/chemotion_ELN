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
      if represented_object.respond_to?(:available_sources)
        represented_object.available_sources
      elsif represented_object.is_a?(SequenceBasedMacromolecule)
        ['eln']
      else
        ['unknown']
      end
    end
  end
end
