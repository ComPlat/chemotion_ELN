# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::ReactionProcessStepExporter do
  subject(:step_export) { described_class.new(process_step).to_clap(starts_at: 10_000) }

  let(:process_step) do
    create(
      :reaction_process_step,
      automation_mode: 'NCIT:C70669',
      automation_control: { status: 'STEP_COMPLETED' },
    )
  end
  let(:activity) do
    create(
      :reaction_process_activity,
      reaction_process_step: process_step,
      activity_name: 'WAIT',
      workup: { duration: 20_000 },
    )
  end

  before do
    create(:ontology, ontology_id: 'NCIT:C70669', label: 'Automation', name: 'Automation mode')
    activity
  end

  it 'exports process_step' do
    expect(step_export.to_h).to include(
      reaction_step_id: process_step.id,
      position: 1,
      start_time: { value: 10.0, unit: :SECOND },
      duration: { value: 20.0, unit: :SECOND },
      automation_mode: { id: 'NCIT:C70669', label: 'Automation', name: 'Automation mode' },
      automation_control: { step_status: :STEP_COMPLETED },
    )
  end

  it 'exports process activities' do
    expect(step_export.to_h).to include(
      actions: [hash_including(wait: { duration: { value: 20.0, unit: :SECOND } })],
    )
  end
end
