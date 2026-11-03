# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::AddActionExporter do
  subject(:addition_export) { described_class.new(action).to_clap(starts_at: 0).addition }

  let(:action) do
    create(:reaction_process_activity_add_sample, workup: workup)
  end
  let(:workup) { {} }

  context 'with complete add action attributes' do
    let(:workup) do
      {
        acts_as: 'SAMPLE',
        target_amount: { value: '10', unit: 'mg' },
        addition_speed_type: 'FLOW_RATE',
        VELOCITY: { value: '2', unit: 'MLMIN' },
        TEMPERATURE: { value: '25', unit: 'CELSIUS', additional_information: 'AMBIENT' },
      }
    end

    it 'exports add action attributes' do
      expect(addition_export.to_h).to include(
        addition_speed_type: :FLOW_RATE,
        flow_rate: { value: 2.0, unit: :MILLILITER_PER_MINUTE },
        addition_conditions: {
          temperature_control: {
            temperature: { value: 25.0, unit: :CELSIUS },
            temperature_control_type: :AMBIENT,
          },
        },
      )
    end

    it 'exports the added sample amount' do
      expect(addition_export.sample.to_h).to include(
        reaction_role: :SAMPLE,
        amount: { mass: { value: 10.0, unit: :MILLIGRAM } },
      )
    end

    it 'exports the default sample purity' do
      expect(addition_export.sample.purity.to_h).to eq(value: 100.0)
    end

    context 'with bad addition_speed_type' do
      let(:workup) { { acts_as: 'SAMPLE', addition_speed_type: 'bad' } }

      it 'falls back for unknown addition speed types' do
        expect(addition_export.addition_speed_type).to eq(:UNSPECIFIED)
      end
    end
  end
end
