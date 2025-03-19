# frozen_string_literal: true

# == Schema Information
#
# Table name: sequence_based_macromolecule_samples
#
#  id                              :bigint           not null, primary key
#  activity_per_mass_unit          :string           default("U/g"), not null
#  activity_per_mass_value         :float
#  activity_per_volume_unit        :string           default("U/L"), not null
#  activity_per_volume_value       :float
#  activity_unit                   :string           default("U"), not null
#  activity_value                  :float
#  amount_as_used_mass_unit        :string           default("g"), not null
#  amount_as_used_mass_value       :float
#  amount_as_used_mol_unit         :string           default("mol"), not null
#  amount_as_used_mol_value        :float
#  ancestry                        :string
#  concentration_unit              :string           default("ng/L"), not null
#  concentration_value             :float
#  deleted_at                      :datetime
#  external_label                  :string
#  function_or_application         :string
#  heterologous_expression         :string           default("unknown"), not null
#  localisation                    :string           default("")
#  molarity_unit                   :string           default("mol/L"), not null
#  molarity_value                  :float
#  name                            :string           not null
#  organism                        :string           default("")
#  short_label                     :string           not null
#  strain                          :string           default("")
#  tissue                          :string           default("")
#  volume_as_used_unit             :string           default("L"), not null
#  volume_as_used_value            :float
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  sequence_based_macromolecule_id :bigint
#  taxon_id                        :string           default("")
#  user_id                         :bigint
#
# Indexes
#
#  idx_sbmm_samples_ancestry    (ancestry)
#  idx_sbmm_samples_deleted_at  (deleted_at)
#  idx_sbmm_samples_sbmm        (sequence_based_macromolecule_id)
#  idx_sbmm_samples_user        (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (sequence_based_macromolecule_id => sequence_based_macromolecules.id)
#  fk_rails_...  (user_id => users.id)
#
class SequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid

  before_create :auto_assign_short_label

  has_many :collections_sequence_based_macromolecule_samples, inverse_of: :sequence_based_macromolecule_sample, dependent: :destroy
  has_many :collections, through: :collections_sequence_based_macromolecule_samples
  belongs_to :sequence_based_macromolecule
  belongs_to :user

  scope :for_user, ->(user_id) { where(user_id: user_id) }
  scope :includes_for_list_display, -> { includes(:sequence_based_macromolecule) }
  scope :in_sbmm_order, -> { joins(:sequence_based_macromolecule).order("`sequence_based_macromolecules`.`systematic_name`" => :asc, updated_at: :desc) }

  def auto_assign_short_label
    return if short_label

    self.short_label = "SBMM-Sample-#{Random.uuid}"
  end
end
