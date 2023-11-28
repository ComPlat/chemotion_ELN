# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::ReactionProcessVesselableExporter do
  subject(:template_export) { described_class.new(reaction_process_vessel).to_clap }

  let(:reaction_process_vessel) do
    create(
      :reaction_process_vessel,
      vesselable: vessel_template,
      preparations: %w[OVEN_DRIED PURGED],
      cleanup: 'STORAGE',
    )
  end

  let(:vessel_template) do
    create(
      :vessel_template,
      details: 'jacketed vessel',
      vessel_type: 'VIAL',
      material_type: 'glass',
      volume_amount: 25,
      volume_unit: 'ml',
    )
  end

  context 'with a vessel template' do
    it 'exports the vessel-template' do
      expect(template_export.to_h).to include(
        id: vessel_template.id,
        name: vessel_template.name,
        details: 'jacketed vessel',
        type: :VIAL,
        material: 'GLASS',
        volume: { value: 25.0, unit: :MILLILITER },
        preparations: [{ type: :OVEN_DRIED }, { type: :PURGED }],
        cleanup: { type: :STORAGE },
      )
    end

    it 'omits a vessel instance for a vessel-template-backed template' do
      expect(template_export.vessel).to be_nil
    end
  end

  context 'with a vessel' do
    let(:vessel) do
      create(
        :vessel,
        vessel_template: vessel_template,
        name: 'R1',
        short_label: 'RV-1',
        description: 'automation reactor',
        bar_code: 'BAR-1',
        qr_code: 'QR-1',
        weight_amount: 12,
        weight_unit: 'g',
      )
    end
    let(:reaction_process_vessel) do
      create(:reaction_process_vessel, vesselable: vessel, preparations: ['OVEN_DRIED'])
    end

    it 'exports the vessel-template' do
      expect(template_export.to_h).to include(
        id: vessel_template.id,
        name: vessel_template.name,
        type: :VIAL,
        material: 'GLASS',
        preparations: [{ type: :OVEN_DRIED }],
        vessel: hash_including(id: vessel.id),
      )
    end

    it 'exports the concrete vessel metadata' do
      expect(template_export.vessel.to_h).to include(
        label: 'RV-1',
        description: 'automation reactor',
        bar_code: 'BAR-1',
        qr_code: 'QR-1',
        weight: { value: 12.0, unit: :GRAM },
      )
    end
  end

  context 'without a vesselable' do
    let(:reaction_process_vessel) { nil }

    it 'returns nil' do
      expect(template_export).to be_nil
    end
  end
end
