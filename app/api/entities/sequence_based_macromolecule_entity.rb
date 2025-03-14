# frozen_string_literal: true

module Entities
  class SequenceBasedMacromoleculeEntity < ApplicationEntity
    expose! :identifier
    expose! :primaryAccession
    expose! :uniprot_source
    expose! :uniprot_derivation
    expose! :secondary_accessions
    expose! :ec_numbers
    expose! :systematic_name
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

    def primary_accession
      (represented_object.accessions || []).first
    end

    def secondary_accessions
      (represented_object.accessions || [])[1..-1]
    end

    def protein_sequence_modifications
      represented_object.protein_sequence_modification
    end

    def post_translational_modifications
      represented_object.post_translational_modification
    end

    def uniprot_protein?
      represented_object.uniprot_derivation == 'uniprot'
    end
  end
end
