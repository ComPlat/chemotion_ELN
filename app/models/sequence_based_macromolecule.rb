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
  ACCESSION_FORMAT = /[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}/.freeze

  acts_as_paranoid
  has_many :sequence_based_macromolecule_samples, dependent: nil
  has_many :collections, through: :sequence_based_macromolecule_samples
  belongs_to :protein_sequence_modification, optional: true
  belongs_to :post_translational_modification, optional: true
  belongs_to :parent, class_name: 'SequenceBasedMacromolecule', optional: true

  has_many :attachments, as: :attachable, inverse_of: :attachable, dependent: :nullify

  scope :uniprot, -> { where(uniprot_derivation: 'uniprot') }
  scope :modified, -> { where(uniprot_derivation: 'uniprot_modified') }
  scope :unknown, -> { where(uniprot_derivation: 'uniprot_unknown') }
  scope :non_uniprot, -> { where(uniprot_derivation: %w[uniprot_modified uniprot_unknown]) }
  scope :with_ec_number, lambda { |ec_number|
                           ec_number ? where('ec_numbers @> ARRAY[?]::varchar[]', [ec_number&.strip]) : none
                         }
  scope :with_accession, lambda { |accession|
                           accession ? where('accessions @> ARRAY[?]::varchar[]', [accession&.strip]) : none
                         }
  scope :search_in_name, lambda { |text|
                           text ? where("systematic_name LIKE '%#{text}%' OR short_name LIKE '%#{text}%'") : none
                         }

  accepts_nested_attributes_for(
    :protein_sequence_modification,
    :post_translational_modification,
  )

  def self.duplicate_sbmm_exists?(base_sbmm)
    duplicate_sbmm(base_sbmm).present?
  end

  def self.duplicate_sbmm(base_sbmm)
    case base_sbmm.uniprot_derivation
    when 'uniprot'
      find_duplicate_uniprot_sbmm(base_sbmm)
    when 'uniprot_modified'
      find_duplicate_modified_sbmm(base_sbmm)
    when 'uniprot_unknown'
      find_duplicate_unknown_sbmm(base_sbmm)
    else
      nil
    end
  end

  def self.find_duplicate_uniprot_sbmm(base_sbmm)
    return unless base_sbmm.primary_accession # shouldn't occur but better safe than sorry

    scope = uniprot
    scope = scope.where.not(id: base_sbmm.id) if base_sbmm.id

    scope.find_by(primary_accession: base_sbmm.primary_accession)
  end

  def self.find_duplicate_modified_sbmm(base_sbmm)
    scope = modified
    scope = scope.where.not(id: base_sbmm.id) if base_sbmm.id
    scope = scope.joins(:protein_sequence_modification, :post_translational_modification)
    scope.find_by(
      sbmm_type: base_sbmm.sbmm_type,
      sequence: base_sbmm.sequence,
      molecular_weight: base_sbmm.molecular_weight,
      heterologous_expression: base_sbmm.heterologous_expression,
      protein_sequence_modification: {
        modification_n_terminal: base_sbmm.protein_sequence_modification.modification_n_terminal,
        modification_c_terminal: base_sbmm.protein_sequence_modification.modification_c_terminal,
        modification_insertion: base_sbmm.protein_sequence_modification.modification_insertion,
        modification_deletion: base_sbmm.protein_sequence_modification.modification_deletion,
        modification_mutation: base_sbmm.protein_sequence_modification.modification_mutation,
        modification_other: base_sbmm.protein_sequence_modification.modification_other
      },
      post_translational_modification: {
        phosphorylation_enabled: base_sbmm.post_translational_modification.phosphorylation_enabled,
        phosphorylation_ser_enabled: base_sbmm.post_translational_modification.phosphorylation_ser_enabled,
        phosphorylation_thr_enabled: base_sbmm.post_translational_modification.phosphorylation_thr_enabled,
        phosphorylation_tyr_enabled: base_sbmm.post_translational_modification.phosphorylation_tyr_enabled,
        glycosylation_enabled: base_sbmm.post_translational_modification.glycosylation_enabled,
        glycosylation_n_linked_asn_enabled: base_sbmm.post_translational_modification.glycosylation_n_linked_asn_enabled,
        glycosylation_o_linked_lys_enabled: base_sbmm.post_translational_modification.glycosylation_o_linked_lys_enabled,
        glycosylation_o_linked_ser_enabled: base_sbmm.post_translational_modification.glycosylation_o_linked_ser_enabled,
        glycosylation_o_linked_thr_enabled: base_sbmm.post_translational_modification.glycosylation_o_linked_thr_enabled,
        acetylation_enabled: base_sbmm.post_translational_modification.acetylation_enabled,
        acetylation_lysin_number: base_sbmm.post_translational_modification.acetylation_lysin_number,
        hydroxylation_enabled: base_sbmm.post_translational_modification.hydroxylation_enabled,
        hydroxylation_lys_enabled: base_sbmm.post_translational_modification.hydroxylation_lys_enabled,
        hydroxylation_pro_enabled: base_sbmm.post_translational_modification.hydroxylation_pro_enabled,
        methylation_enabled: base_sbmm.post_translational_modification.methylation_enabled,
        methylation_arg_enabled: base_sbmm.post_translational_modification.methylation_arg_enabled,
        methylation_glu_enabled: base_sbmm.post_translational_modification.methylation_glu_enabled,
        methylation_lys_enabled: base_sbmm.post_translational_modification.methylation_lys_enabled,
        other_modifications_enabled: base_sbmm.post_translational_modification.other_modifications_enabled
      }
    )
  end

  def self.find_duplicate_unknown_sbmm(base_sbmm)
    scope = unknown
    scope = scope.where.not(id: base_sbmm.id) if base_sbmm.id
    scope.find_by(
      sbmm_type: base_sbmm.sbmm_type,
      sequence: base_sbmm.sequence,
      molecular_weight: base_sbmm.molecular_weight,
      heterologous_expression: base_sbmm.heterologous_expression
    )
  end
end
