# frozen_string_literal: true

class Component < ApplicationRecord
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
