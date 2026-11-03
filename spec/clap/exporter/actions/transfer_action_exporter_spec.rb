# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::TransferActionExporter do
  subject(:transfer_export) { described_class.new(action).to_clap(starts_at: 0).transfer }

  let(:action) do
    create(
      :reaction_process_activity_add_sample,
      activity_name: 'TRANSFER',
      workup: {
        source_step_id: 'source-step',
        target_step_id: 'target-step',
        target_amount: { value: '1', unit: 'ml', percentage: 25 },
      },
    )
  end

  it 'exports transfer source and target' do
    expect(transfer_export.to_h).to include(
      source_reaction_step_id: 'source-step',
      target_reaction_step_id: 'target-step',
      amount: { volume: { value: 1.0, unit: :MILLILITER } },
      percentage: { value: 25.0 },
    )
  end

  it 'exports transferred sample details' do
    expect(transfer_export.sample.to_h).to include(
      reaction_role: :SAMPLE,
      amount: { volume: { value: 1.0, unit: :MILLILITER } },
    )
  end
end
