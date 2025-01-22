# frozen_string_literal: true

# == Schema Information
#
# Table name: ontology_device_methods
#
#  id                    :uuid             not null, primary key
#  ontology_id           :uuid
#  label                 :string
#  detectors             :jsonb
#  mobile_phase          :jsonb            is an Array
#  stationary_phase      :jsonb            is an Array
#  default_inject_volume :jsonb
#  description           :string
#  steps                 :jsonb
#  active                :boolean          default(TRUE), not null
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#

module ReactionProcessEditor
  class OntologyDeviceMethod < ApplicationRecord
    belongs_to :ontology, class_name: '::ReactionProcessEditor::Ontology', optional: true

    validates :label, presence: true, uniqueness: { scope: [:ontology] }
  end
end
