# frozen_string_literal: true

# == Schema Information
#
# Table name: protein_sequence_modifications
#
#  id                              :bigint           not null, primary key
#  deleted_at                      :datetime
#  modification_c_terminal         :boolean          default(FALSE), not null
#  modification_c_terminal_details :string           default("")
#  modification_deletion           :boolean          default(FALSE), not null
#  modification_deletion_details   :string           default("")
#  modification_insertion          :boolean          default(FALSE), not null
#  modification_insertion_details  :string           default("")
#  modification_mutation           :boolean          default(FALSE), not null
#  modification_mutation_details   :string           default("")
#  modification_n_terminal         :boolean          default(FALSE), not null
#  modification_n_terminal_details :string           default("")
#  modification_other              :boolean          default(FALSE), not null
#  modification_other_details      :string           default("")
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#
# Indexes
#
#  idx_sbmm_psm_deleted_at  (deleted_at)
#
class ProteinSequenceModification < ApplicationRecord
  has_many :sequence_based_macromolecules, dependent: nil # questionable... should actually be a belongs_to relation now

  def self.attributes_for_sbmm_uniqueness
    %i[
      modification_c_terminal
      modification_deletion
      modification_insertion
      modification_mutation
      modification_n_terminal
      modification_other
    ]
  end
end
