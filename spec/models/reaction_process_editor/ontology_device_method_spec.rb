# frozen_string_literal: true

# == Schema Information
#
# Table name: ontology_device_methods
#
#  id                    :uuid             not null, primary key
#  active                :boolean          default(TRUE), not null
#  default_inject_volume :jsonb
#  description           :string
#  detectors             :jsonb
#  label                 :string
#  mobile_phase          :jsonb            is an Array
#  stationary_phase      :jsonb            is an Array
#  steps                 :jsonb
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  ontology_id           :uuid
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::OntologyDeviceMethod do
  subject(:device_method) { described_class.new(label: 'HPLC', ontology: ontology) }

  let(:ontology) do
    create(
      :ontology,
      ontology_id: 'CHMO:0000002',
      label: 'Chromatography',
    )
  end

  it { is_expected.to belong_to(:ontology) }
  it { is_expected.to validate_presence_of(:label) }
  it { is_expected.to validate_uniqueness_of(:label).scoped_to(:ontology_id) }
end
