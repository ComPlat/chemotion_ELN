# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::EvaporationActionExporter do
  subject(:evaporation_export) { described_class.new(action).to_clap(starts_at: 0).evaporation }

  let(:action) do
    create(:reaction_process_activity, activity_name: 'GAS_EXCHANGE', workup: workup)
  end

  let(:workup) { {} }

  context 'with origin FROM REACTION' do
    let(:workup) do
      { origin_type: 'FROM_REACTION',
        samples: [{ label: 'sample' }],
        amount: { value: '1', unit: 'mg' },
        solvents: [{ label: 'solvent', ratio: 1 }],
        solvents_amount: { value: '2', unit: 'ml' } }
    end

    it 'exports as :from_reaction' do
      expect(evaporation_export.from_reaction.to_h).to include(samples: [{ label: 'sample' }])
    end
  end

  context 'with origin FROM REACTION STEP' do
    let(:workup) { { origin_type: 'FROM_REACTION_STEP', samples: [{ label: 'sample' }] } }

    it 'exports as :from_reaction_step' do
      expect(evaporation_export.from_reaction_step.to_h).to include(samples: [{ label: 'sample' }])
    end
  end

  context 'with origin FROM_SAMPLE' do
    let(:workup) { { origin_type: 'FROM_SAMPLE', samples: [{ label: 'sample' }] } }

    it 'exports as :from_sample' do
      expect(evaporation_export.from_sample.to_h).to include(samples: [{ label: 'sample' }])
    end
  end

  context 'with origin FROM_METHOD' do
    let(:workup) do
      { origin_type: 'FROM_METHOD', starter_conditions: { TEMPERATURE: { value: '20', unit: 'CELSIUS' } },
        remove_steps: [{ duration: 1000, TEMPERATURE: { value: '30', unit: 'CELSIUS' } }] }
    end

    it 'exports as :from_method' do
      expect(evaporation_export.from_method.to_h).to include(
        limits: [hash_including(duration: { value: 1.0, unit: :SECOND })],
      )
    end
  end

  context 'with origin STEPWISE' do
    let(:workup) { { origin_type: 'STEPWISE', starter_conditions: { TEMPERATURE: { value: '20', unit: 'CELSIUS' } } } }

    it 'exports as :stepwise' do
      expect(evaporation_export.stepwise.to_h).to include(
        starter_conditions: hash_including(temperature_control: { temperature: { unit: :CELSIUS, value: 20.0 } }),
      )
    end
  end

  context 'with origin SOLVENT_FROM_FRACTION' do
    let!(:consumed_fraction) { create(:fraction, consuming_action: action) }

    let(:workup) do
      { origin_type: 'SOLVENT_FROM_FRACTION' }
    end

    it 'exports as :solvent_from_fraction' do
      expect(evaporation_export.solvent_from_fraction.to_h).to include(
        consumed_fraction: hash_including(vials: Array,
                                          consuming_action_id: action.id,
                                          parent_action_id: consumed_fraction.parent_action_id),
      )
    end
  end

  context 'with origin DIVERSE_SOLVENTS' do
    let(:workup) do
      {
        origin_type: 'DIVERSE_SOLVENTS',
        solvents: [{ label: 'solvent', ratio: 3 }],
        solvents_amount: { value: '4', unit: 'ml' },
      }
    end

    it 'exports as :diverse_solvent' do
      expect(evaporation_export.to_h).to eq(
        diverse_solvents: {
          solvents: [{ solvent: { label: 'solvent' }, ratio: '3' }],
          solvents_amount: { volume: { value: 4.0, unit: :MILLILITER } },
        },
      )
    end
  end
end
