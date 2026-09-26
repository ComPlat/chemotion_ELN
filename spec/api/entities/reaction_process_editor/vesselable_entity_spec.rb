# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::VesselableEntity do
  context 'when VesselTemplate' do
    subject(:represented_vessel_template) { described_class.represent(vessel_template).as_json }

    let(:vessel_template) { create(:vessel_template, name: 'Template Vessel') }

    it 'represents vessel templates as template vesselables' do
      expect(represented_vessel_template).to include(
        label: 'Template Vessel',
        short_label: '',
        vesselable_type: 'VesselTemplate',
        vessel_template_id: vessel_template.id,
        qr_code: nil,
        bar_code: nil,
      )
    end
  end

  context 'when Vessel' do
    subject(:represented_vessel) { described_class.represent(vessel).as_json }

    let(:vessel) { create(:vessel, short_label: 'V1', description: 'Used vessel') }

    it 'represents vessels as concrete vesselables' do
      expect(represented_vessel).to include(
        label: 'V1',
        description: 'Used vessel',
        vesselable_type: 'Vessel',
        vessel_template_id: vessel.vessel_template_id,
      )
    end
  end
end
