# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::SaveSampleActionExporter do
  subject(:save_sample_export) { described_class.new(action).to_clap(starts_at: 0).save_sample }

  let(:action) do
    create(
      :reaction_process_activity_save,
      workup: {
        acts_as: 'SAMPLE',
        target_amount: { value: '2', unit: 'mg' },
        sample_origin_type: 'SPLIT',
        molecular_entities: [{ label: 'entity' }],
      },
    )
  end

  it 'exports saved sample' do
    expect(save_sample_export.to_h).to include(
      sample_origin_type: :SPLIT,
      molecular_entities: [{ label: 'entity' }],
    )
  end

  it 'exports saved sample amount' do
    expect(save_sample_export.sample.to_h).to include(
      reaction_role: :SAMPLE,
      amount: { mass: { value: 2.0, unit: :MILLIGRAM } },
    )
  end

  context 'with purification origin' do
    let(:action) do
      create(
        :reaction_process_activity_save,
        workup: {
          acts_as: 'SAMPLE',
          sample_origin_type: 'PURIFICATION',
          sample_origin_action_id: 'purification-action',
          sample_origin_purification_step: { position: 3 },
          solvents_amount: { value: '2', unit: 'ml' },
        },
      )
    end

    it 'exports the purification origin action id' do
      expect(save_sample_export.purification_origin.origin_action_id).to eq('purification-action')
    end

    it 'exports the purification origin step position' do
      expect(save_sample_export.purification_origin.origin_purification_step_position).to eq(3)
    end

    it 'exports the purification origin amount' do
      expect(save_sample_export.purification_origin.amount).to have_attributes(
        volume: have_attributes(value: 2.0, unit: :MILLILITER),
      )
    end
  end

  context 'with empty origin type' do
    let(:action) do
      create(:reaction_process_activity_save, workup: { acts_as: 'SAMPLE', sample_origin_type: nil })
    end

    it 'falls back for unknown sample origin types' do
      expect(save_sample_export.sample_origin_type).to eq(:UNSPECIFIED)
    end
  end
end
