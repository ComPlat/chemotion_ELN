# frozen_string_literal: true

# == Schema Information
#
# Table name: post_translational_modifications
#
#  id                                 :bigint           not null, primary key
#  acetylation_enabled                :boolean          default(FALSE), not null
#  acetylation_lysin_number           :float
#  deleted_at                         :datetime
#  glycosylation_enabled              :boolean          default(FALSE), not null
#  glycosylation_n_linked_asn_details :string           default("")
#  glycosylation_n_linked_asn_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_lys_details :string           default("")
#  glycosylation_o_linked_lys_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_ser_details :string           default("")
#  glycosylation_o_linked_ser_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_thr_details :string           default("")
#  glycosylation_o_linked_thr_enabled :boolean          default(FALSE), not null
#  hydroxylation_enabled              :boolean          default(FALSE), not null
#  hydroxylation_lys_details          :string           default("t")
#  hydroxylation_lys_enabled          :boolean          default(FALSE), not null
#  hydroxylation_pro_details          :string           default("t")
#  hydroxylation_pro_enabled          :boolean          default(FALSE), not null
#  methylation_arg_details            :string           default("")
#  methylation_arg_enabled            :boolean          default(FALSE), not null
#  methylation_enabled                :boolean          default(FALSE), not null
#  methylation_glu_details            :string           default("")
#  methylation_glu_enabled            :boolean          default(FALSE), not null
#  methylation_lys_details            :string           default("")
#  methylation_lys_enabled            :boolean          default(FALSE), not null
#  other_modifications_details        :string           default("")
#  other_modifications_enabled        :boolean          default(FALSE), not null
#  phosphorylation_enabled            :boolean          default(FALSE), not null
#  phosphorylation_ser_details        :string           default("")
#  phosphorylation_ser_enabled        :boolean          default(FALSE), not null
#  phosphorylation_thr_details        :string           default("")
#  phosphorylation_thr_enabled        :boolean          default(FALSE), not null
#  phosphorylation_tyr_details        :string           default("")
#  phosphorylation_tyr_enabled        :boolean          default(FALSE), not null
#  created_at                         :datetime         not null
#  updated_at                         :datetime         not null
#
# Indexes
#
#  idx_sbmm_ptm_deleted_at  (deleted_at)
#
class PostTranslationalModification < ApplicationRecord
  has_many :sequence_based_macromolecules
end
