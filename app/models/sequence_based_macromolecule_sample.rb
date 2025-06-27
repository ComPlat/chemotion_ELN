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

  include ElementUIStateScopes
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include Taggable

  before_create :auto_assign_short_label

  has_one :container, as: :containable, inverse_of: :containable, dependent: :nullify
  has_ancestry orphan_strategy: :adopt

  has_many :attachments, as: :attachable, inverse_of: :attachable, dependent: :nullify
  has_many :collections_sequence_based_macromolecule_samples, inverse_of: :sequence_based_macromolecule_sample,
                                                              dependent: :destroy
  has_many :collections, through: :collections_sequence_based_macromolecule_samples
  has_many :comments, as: :commentable, inverse_of: :commentable, dependent: :destroy
  has_many :sync_collections_users, through: :collections

  belongs_to :sequence_based_macromolecule
  belongs_to :user

  scope :created_by, ->(user_id) { where(user_id: user_id) }
  scope :includes_for_list_display, -> { includes(:sequence_based_macromolecule) }
  scope :in_sbmm_order, lambda {
                          joins(:sequence_based_macromolecule)
                            .order(updated_at: :desc, 'sequence_based_macromolecules.short_name' => :asc)
                        }

  def analyses
    container&.analyses || []
  end

  def auto_assign_short_label
    return if short_label
    return unless user

    prefix = 'sbmmS'
    abbr = user.name_abbreviation
    self.short_label = "#{abbr}-#{prefix}#{user.counters['sequence_based_macromolecule_samples'].to_i.succ}"
    user.increment_counter 'sequence_based_macromolecule_samples' # rubocop:disable Rails/SkipsModelValidations
  end

  def counter_for_split_short_label
    element_children = children.with_deleted.order('created_at')
    last_child_label = element_children.where('short_label LIKE ?', "#{short_label}-%").last&.short_label
    last_child_counter = (last_child_label&.match(/^#{short_label}-(\d+)/) && ::Regexp.last_match(1).to_i) || 0

    [last_child_counter, element_children.count].max
  end

  def all_collections(user, collection_ids)
    Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
  end

  def create_sub_sequence_based_macromolecule_sample(user, collection_ids)
    sub_sbmm_sample = dup
    sub_sbmm_sample.short_label = "#{short_label}-#{counter_for_split_short_label + 1}"
    sub_sbmm_sample.parent = self
    sub_sbmm_sample.user_id = user.id
    sub_sbmm_sample.collections << all_collections(user, collection_ids)
    sub_sbmm_sample.container = Container.create_root_container
    sub_sbmm_sample.save!
    sub_sbmm_sample
  end
end
