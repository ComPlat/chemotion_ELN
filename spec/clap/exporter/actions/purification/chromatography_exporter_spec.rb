# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Purification::ChromatographyExporter do
  subject(:chromatography_export) do
    described_class.new(chromatography_action).to_clap(starts_at: 0).chromatography
  end

  let(:reaction_process_step) { create_default(:reaction_process_step, automation_mode: step_automation_mode) }
  let(:step_automation_mode) { 'NCIT:C70669' }

  let(:chromatography_action) { create(:reaction_process_activity, activity_name: 'CHROMATOGRAPHY', workup: workup) }
  let(:workup) { {} }

  before do
    reaction_process_step
    ReactionProcessEditor::Ontology.create!(ontology_id: 'ONT:material', label: 'Material', name: 'Material')
    ReactionProcessEditor::Ontology.create!(ontology_id: 'ONT:detector', label: 'Detector', name: 'Detector')
    ReactionProcessEditor::Ontology.create!(ontology_id: 'ONT:mobile', label: 'Mobile', name: 'Mobile')
  end

  context 'with reaction_process_step MANUAL' do
    let(:step_automation_mode) { 'NCIT:C63513' }

    let(:workup) do
      {
        jar_material: 'ONT:material',
        jar_diameter: { value: '1', unit: 'CM' },
        jar_height: { value: '2', unit: 'CM' },
        jar_filling_height: { value: '3', unit: 'CM' },
      }
    end

    it 'exports manual chromatography fields (material, diameter, height, filling_height)' do
      expect(chromatography_export.to_h).to include(
        material: { id: 'ONT:material', label: 'Material', name: 'Material' },
        diameter: { value: 1.0, unit: :CENTIMETER },
        height: { value: 2.0, unit: :CENTIMETER },
        filling_height: { value: 3.0, unit: :CENTIMETER },
      )
    end
  end

  context 'with reaction_process_step AUTOMATED' do
    let(:step_automation_mode) { 'NCIT:C70669' }

    let(:workup) do
      {
        detector: ['ONT:detector'],
        detector_conditions: { 'ONT:detector' => { TEMPERATURE: { value: '10', unit: 'CELSIUS' } } },
        mobile_phase: ['ONT:mobile'],
        stationary_phase_temperature: { value: '25', unit: 'CELSIUS' },
        inject_volume: { value: '5', unit: 'ml' },
      }
    end

    it 'exports automated chromatography fields (detectors, mobile_phase, stationary_phase, inject_volume)' do
      expect(chromatography_export.to_h).to include(
        detectors: [hash_including(ontology: { id: 'ONT:detector', label: 'Detector', name: 'Detector' })],
        mobile_phase: [{ id: 'ONT:mobile', label: 'Mobile', name: 'Mobile' }],
        stationary_phase_temperature: { temperature: { value: 25.0, unit: :CELSIUS } },
        inject_volume: { value: 5.0, unit: :MILLILITER },
      )
    end
  end

  context 'with unknown chromatography step modes' do
    let(:workup) do
      { purification_steps: [{ step_mode: 'bad', prod_mode: 'bad' }] }
    end

    let(:step_clap) { chromatography_export.steps.first }

    it 'falls back for unknown chromatography step modes' do
      expect([step_clap.step, step_clap.prod]).to eq(%i[STEP_UNSPECIFIED PROD_UNSPECIFIED])
    end
  end

  context 'with consumed fractions' do
    let(:fraction) { create(:fraction, parent_action: chromatography_action) }

    before do
      fraction
    end

    it 'exports consumed fractions' do
      expect(chromatography_export.fractions.first.position).to eq(1)
    end
  end

  context 'with chromatography steps' do
    let(:workup) do
      {
        stationary_phase: 'silica',
        samples: [{ label: 'sample' }],
        molecular_entities: [{ label: 'entity' }],
        purification_steps: [{
          solvents: [{ label: 'solvent', ratio: 1 }],
          amount: { value: '1', unit: 'ml' },
          flow_rate: { value: '2', unit: 'MLMIN' },
          duration: 30_000,
          step_mode: 'SEPARATION',
          prod_mode: 'PROD',
        }],
      }
    end

    it 'exports chromatography steps' do
      expect(chromatography_export.to_h).to include(
        stationary_phase: 'silica',
        samples: [{ label: 'sample' }],
        molecular_entities: [{ label: 'entity' }],
        steps: [hash_including(step: :SEPARATION, prod: :PROD)],
      )
    end
  end
end
