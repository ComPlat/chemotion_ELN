# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions_reactant_sbmm_samples
#
#  id                                     :bigint           not null, primary key
#  deleted_at                             :datetime
#  position                               :integer
#  show_label                             :boolean          default(FALSE), not null
#  created_at                             :datetime
#  updated_at                             :datetime
#  reaction_id                            :integer          not null
#  sequence_based_macromolecule_sample_id :bigint           not null
#
# Indexes
#
#  idx_rxn_reactant_sbmm_on_deleted  (deleted_at)
#  idx_rxn_reactant_sbmm_on_rxn_id   (reaction_id)
#  idx_rxn_reactant_sbmm_on_sbmm_id  (sequence_based_macromolecule_sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (reaction_id => reactions.id)
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#

class ReactionsReactantSbmmSample < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :reaction, optional: true
  belongs_to :sequence_based_macromolecule_sample, optional: true

  include Tagging
  include Reactable

  def self.get_sbmm_samples(reaction_ids)
    where(reaction_id: reaction_ids).pluck(:sequence_based_macromolecule_sample_id).compact.uniq
  end

  def self.get_reactions(sbmm_sample_ids)
    where(sequence_based_macromolecule_sample_id: sbmm_sample_ids).pluck(:reaction_id).compact.uniq
  end
end
