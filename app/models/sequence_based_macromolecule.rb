# frozen_string_literal: true

# == Schema Information
#
# Table name: sequence_based_macromolecules
#
#  id                                       :bigint           not null, primary key
#  accessions                               :string           is an Array
#  deleted_at                               :datetime
#  ec_numbers                               :string           is an Array
#  heterologous_expression                  :string           default("unknown"), not null
#  link_pdb                                 :string
#  link_uniprot                             :string
#  localisation                             :string           default("")
#  molecular_weight                         :float
#  organism                                 :string           default("")
#  other_identifier                         :string           default("")
#  own_identifier                           :string           default("")
#  pdb_doi                                  :string
#  primary_accession                        :string
#  protein_source_details_comments          :string           default("")
#  protein_source_details_expression_system :string           default("")
#  sbmm_subtype                             :string           not null
#  sbmm_type                                :string           not null
#  sequence                                 :string           not null
#  short_name                               :string           not null
#  strain                                   :string           default("")
#  systematic_name                          :string
#  tissue                                   :string           default("")
#  uniprot_derivation                       :string           not null
#  uniprot_source                           :jsonb
#  created_at                               :datetime         not null
#  updated_at                               :datetime         not null
#  parent_id                                :bigint
#  post_translational_modification_id       :bigint
#  protein_sequence_modification_id         :bigint
#  taxon_id                                 :string           default("")
#
# Indexes
#
#  idx_sbmm_accessions         (accessions)
#  idx_sbmm_deleted_at         (deleted_at)
#  idx_sbmm_ec_numbers         (ec_numbers)
#  idx_sbmm_parent             (parent_id)
#  idx_sbmm_pdb_doi            (pdb_doi)
#  idx_sbmm_primary_accession  (primary_accession)
#  idx_sbmm_psm_id             (protein_sequence_modification_id)
#  idx_sbmm_ptm_id             (post_translational_modification_id)
#  idx_sbmm_sequence           (sequence)
#  idx_sbmm_short_name         (short_name)
#  idx_sbmm_systematic_name    (systematic_name)
#
class SequenceBasedMacromolecule < ApplicationRecord
  ACCESSION_FORMAT = /[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}/

  acts_as_paranoid
  has_many :sequence_based_macromolecule_samples
  has_many :collections, through: :sequence_based_macromolecule_samples
  belongs_to :protein_sequence_modification, optional: true
  belongs_to :post_translational_modification, optional: true
  belongs_to :parent, class_name: "SequenceBasedMacromolecule", optional: true

  scope :uniprot, -> { where(uniprot_derivation: 'uniprot') }
  scope :modified, -> { where(uniprot_derivation: 'uniprot_modified') }
  scope :unknown, -> { where(uniprot_derivation: 'uniprot_unknown') }
  scope :with_ec_number, ->(ec_number) { where('ec_numbers @> ARRAY[?]::varchar[]', [ec_number&.strip]) }

  accepts_nested_attributes_for(
    :sequence_based_macromolecule_samples,
    :protein_sequence_modification,
    :post_translational_modification
  )
end
