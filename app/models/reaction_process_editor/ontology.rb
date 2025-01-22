# frozen_string_literal: true

# == Schema Information
#
# Table name: ontologies
#
#  id               :uuid             not null, primary key
#  ontology_id      :string
#  name             :string
#  label            :string
#  link             :string
#  roles            :jsonb
#  detectors        :string           default([]), is an Array
#  solvents         :string           default([]), is an Array
#  active           :boolean          default(TRUE), not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  stationary_phase :string           is an Array
#

module ReactionProcessEditor
  class Ontology < ApplicationRecord
    validates :ontology_id, presence: true, uniqueness: true
    has_many :device_methods, class_name: '::ReactionProcessEditor::OntologyDeviceMethod',
                              inverse_of: :ontology, dependent: :nullify

    scope :active, -> { where(active: true) }
  end
end
