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
    expose! :full_name
    expose! :short_name
    expose! :molecular_weight
    expose! :sequence
    expose! :sequence_length
    expose! :link_uniprot
    expose! :link_pdb
    expose! :pdb_doi
    expose! :heterologous_expression
    expose! :organism
    expose! :taxon_id
    expose! :strain
    expose! :tissue
    expose! :localisation
    expose! :own_identifier
    expose! :other_identifier
    expose! :parent, using: 'Entities::SequenceBasedMacromoleculeEntity'

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

    def full_name
      object.systematic_name
    end

    def sequence_length
      (object.sequence || "").length
    end
  end
end
