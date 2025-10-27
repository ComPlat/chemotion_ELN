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
#  sbmm_subtype                             :string
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
    it 'returns only SBMM records that have the matching ec number' do
      sbmm1 = create(:uniprot_sbmm, ec_numbers: ['1.2.3', '1.2.4'])
      create(:uniprot_sbmm, ec_numbers: ['1.2.1', '1.2.4'])

      result = described_class.with_ec_number('1.2.3')

      expect(result.count).to eq 1
      expect(result.first.id).to be sbmm1.id
    end
  end

  describe '.search_in_name' do
    it 'finds the result in a case-insensitive way' do
      sbmm1 = create(:uniprot_sbmm, short_name: 'Insulin')
      sbmm2 = create(:uniprot_sbmm, short_name: 'Some insulin-producing Protein')
      create(:uniprot_sbmm, short_name: 'Some other protein')

      result = described_class.search_in_name('insulin')

      expect(result.count).to eq 2
      expect(result.map(&:id).sort).to eq [sbmm1.id, sbmm2.id].sort
    end
  end

  describe '#assign_attributes' do
    it 'recursively assigns attributes to PTM/PSM' do
      sbmm = create(:modified_uniprot_sbmm)
      attributes = {
        short_name: 'BlaKeks',
        protein_sequence_modification_attributes: {
          modification_c_terminal_details: 'Some Details',
        },
      }

      sbmm.assign_attributes(attributes)

      expect(sbmm.short_name).to eq 'BlaKeks'
      expect(sbmm.protein_sequence_modification.modification_c_terminal_details).to eq 'Some Details'
    end
  end

  # describe '.before_save' do
  #   it 'calculates the mass from sequence if none is given' do
  #     sbmm = build(:uniprot_sbmm)
  #     sbmm.molecular_weight = nil

  #     expect { sbmm.save! }.to change(sbmm, :molecular_weight).from(nil).to(47_409.34)
  #   end
  # end
end
