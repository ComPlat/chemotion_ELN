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
require 'rails_helper'

describe SequenceBasedMacromolecule do
  describe '.with_ec_number' do
    it "returns only SBMM records that have the matching ec number" do
      sbmm1 = create(:uniprot_sbmm, ec_numbers: ["1.2.3", "1.2.4"])
      sbmm2 = create(:uniprot_sbmm, ec_numbers: ["1.2.1", "1.2.4"])

      result = described_class.with_ec_number("1.2.3")

      expect(result.count).to eq 1
      expect(result.first.id).to be sbmm1.id
    end
  end
end
