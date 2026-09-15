# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::SaveSample::PurificationOriginExporter do
  subject(:origin_export) { described_class.new(action).to_clap }

  let(:action) do
    create(
      :reaction_process_activity_save,
      workup: {
        sample_origin_action_id: 'action-1',
        sample_origin_purification_step: { position: 2 },
        solvents_amount: { value: '1', unit: 'ml' },
      },
    )
  end

  it 'exports purification origin' do
    expect(origin_export).to include(
      origin_action_id: 'action-1',
      origin_purification_step_position: 2,
      amount: have_attributes(volume: have_attributes(value: 1.0, unit: :MILLILITER)),
      solvents: [],
      extra_solvents: [],
    )
  end
end
