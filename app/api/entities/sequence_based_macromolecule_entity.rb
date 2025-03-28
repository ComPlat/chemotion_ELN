# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeEntity < ApplicationEntity
    expose! :id
    expose! :sbmm_type
    expose! :sbmm_subtype
    expose! :primary_accession
    expose! :accessions
    expose! :uniprot_source
    expose! :uniprot_derivation
    expose! :ec_numbers
    expose! :systematic_name
    expose! :short_name
    expose! :molecular_weight
    expose! :sequence
    expose! :link_uniprot
    expose! :organism
    expose! :taxon_id
    expose! :strain
    expose! :tissue
    expose! :localisation
    expose! :parent, using: 'Entities::SequenceBasedMacromoleculeEntity'
    expose! :sample, if: ->(instance, options) { options[:sample].present? }, using: 'Entities::SequenceBasedMacromoleculeSampleEntity'

    expose! :protein_sequence_modifications, using: 'Entities::ProteinSequenceModificationsEntity', unless: :uniprot_protein?
    expose! :post_translational_modifications, using: 'Entities::PostTranslationalModificationsEntity', unless: :uniprot_protein?
    expose_timestamps

    private

    def protein_sequence_modifications
      object.protein_sequence_modification
    end

    def post_translational_modifications
      object.post_translational_modification
    end

    def uniprot_protein?
      object.uniprot_derivation == 'uniprot'
    end
  end
end
