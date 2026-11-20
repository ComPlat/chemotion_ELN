# frozen_string_literal: true

# == Schema Information
#
# Table name: matrices
#
#  id          :integer          not null, primary key
#  name        :string           not null
#  enabled     :boolean          default(FALSE)
#  label       :string
#  include_ids :integer          default([]), is an Array
#  exclude_ids :integer          default([]), is an Array
#  configs     :jsonb            not null
#  created_at  :datetime
#  updated_at  :datetime
#  deleted_at  :datetime
#
# Indexes
#
#  index_matrices_on_name  (name) UNIQUE
#
class Matrice < ApplicationRecord
  include SequenceUtilities

  # users.matrix is an int4 holding sum(2^id), so 2^31 already overflows it.
  MAX_ID = 30

  acts_as_paranoid
  before_create :clean_invalid_ids
  before_create :assign_id_in_range
  after_create :gen_json
  after_destroy :gen_json

  def self.gen_matrices_json
    mx = pluck(:name, :id).to_h || {}
  rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
    mx = {}
  ensure
    Rails.root.join('config/matrices.json').write(
      mx.to_json.concat("\n"),
    )
  end

  def self.extra_rules
    configs = find_by(name: 'userProvider')&.configs || {}
    configs.dig('extra_rules', 'enable') == true ? configs['extra_rules'] : {}
  end

  def self.molecule_viewer
    configs_for('moleculeViewer')
  end

  def self.fast_input
    configs_for('fastInput')
  end

  def self.configs_for(name)
    rec = find_by(name: name)
    { feature_enabled: rec&.enabled || false }.merge(rec&.configs || {}).deep_symbolize_keys.with_indifferent_access
  end

  private_class_method :configs_for

  private

  def gen_json
    Matrice.gen_matrices_json
  end

  # Remove matrices with id > MAX_ID.
  # @note: this is a temporary solution to remove invalid matrices
  def clean_invalid_ids
    self.class.where('id > ?', MAX_ID).find_each(&:really_destroy!)
  end

  # Give the new matrice the id after the highest one, soft-deleted rows included, and
  # refuse it when that is beyond MAX_ID: the insert trigger would overflow users.matrix.
  # The sequence is moved along so that inserts relying on it stay in step.
  def assign_id_in_range
    self.id ||= self.class.last_id + 1
    if id > MAX_ID
      errors.add(:id, "#{id} is beyond the #{MAX_ID} available UI feature slots")
      throw :abort
    end

    self.class.reset_sequence(id)
  end
end
