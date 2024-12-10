# frozen_string_literal: true

# == Schema Information
#
# Table name: ontologies
#
#  id          :uuid             not null, primary key
#  chmo_id     :string
#  device_code :string
#  name        :string
#  label       :string
#  link        :string
#  roles       :jsonb
#  detectors   :string           default([]), is an Array
#  solvents    :string           default([]), is an Array
#  active      :boolean          default(TRUE), not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#

module ReactionProcessEditor
  class Ontology < ApplicationRecord
    validates :chmo_id, presence: true, uniqueness: true
    has_many :device_methods, class_name: '::ReactionProcessEditor::OntologyDeviceMethod',
                              inverse_of: :ontology, dependent: :nullify

    before_validation :set_device_code

    scope :active, -> { where(active: true) }

    def self.normalize_device_code(device_name:)
      device_name&.upcase&.tr('^A-Za-z0-9', '')
    end

    private

    def set_device_code
      self.device_code = Ontology.normalize_device_code(device_name: label)
    end
  end
end
