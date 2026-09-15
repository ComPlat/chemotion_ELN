# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Models::AutomationControlExporter do
  subject(:automation_export) { described_class.new(workup).to_clap }

  let(:workup) { { 'status' => 'bad' } }

  it 'falls back for unknown automation statuses' do
    expect(automation_export[:status]).to eq(
      Clap::AutomationControl::AutomationStatus::AUTOMATION_STATUS_UNSPECIFIED,
    )
  end

  context 'without automation control' do
    let(:workup) { nil }

    it 'defaults missing automation control to can run' do
      expect(automation_export).to eq(status: Clap::AutomationControl::AutomationStatus::CAN_RUN)
    end
  end

  context 'with dependency fields' do
    let(:workup) do
      {
        'status' => 'DEPENDS_ON_ACTION',
        'depends_on_action_id' => 'action-1',
        'depends_on_step_id' => 'step-1',
      }
    end

    it 'exports dependency fields' do
      expect(automation_export).to eq(
        status: Clap::AutomationControl::AutomationStatus::DEPENDS_ON_ACTION,
        depends_on_action_id: 'action-1',
        depends_on_step_id: 'step-1',
      )
    end
  end
end
