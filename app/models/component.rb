# frozen_string_literal: true

# == Schema Information
#
# Table name: components
#
#  id                   :bigint           not null, primary key
#  component_properties :jsonb
#  deleted_at           :datetime
#  name                 :string
#  position             :integer
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  sample_id            :bigint           not null
#
# Indexes
#
#  index_components_on_sample_id  (sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (sample_id => samples.id)
#
class Component < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :sample

  validates :position, numericality: { only_integer: true }, allow_nil: true
  validate :validate_component_properties
  validate :validate_name

  private

  def validate_component_properties
    unless component_properties.is_a?(Hash)
      errors.add(:component_properties, 'must be a Hash')
      return
    end

    molecule_id = component_properties[:molecule_id] || component_properties['molecule_id']
    return if molecule_id.present? && molecule_id.to_i.positive?

    errors.add(:component_properties, 'must contain a valid molecule_id')
  end

  def validate_name
    return if name.nil? || name.is_a?(String)

    errors.add(:name, 'must be a string')
  end
end
