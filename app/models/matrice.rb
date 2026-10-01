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

  acts_as_paranoid
  before_create :clean_invalid_ids
  before_create :reset_sequence
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

  # Remove matrices with id > 31
  # @note: this is a temporary solution to remove invalid matrices
  def clean_invalid_ids
    self.class.where('id > 31').find_each(&:really_destroy!)
  end

  # Replaces the SequenceUtilities callback of the same name (that one is defined
  # on this class by `included do`, so there is no super to call).
  #
  # users.matrix is a 32-bit bitmask of sum(2^id), so an id past 30 overflows it.
  # SequenceUtilities will not compact from an empty table (last_id 0), which is
  # what a rolled-back test run leaves behind, so ids climb until the bitmask
  # breaks. Restart from 1 when there is nothing left to collide with.
  def reset_sequence
    return unless self.class.column_type(:id) == :integer

    if self.class.with_deleted.exists?
      self.class.reset_sequence unless self.class.sequence_val <= self.class.last_id
    else
      self.class.connection.execute("SELECT setval('#{self.class.sequence_name}', 1, false);")
    end
  end
end
